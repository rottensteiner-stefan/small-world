// `SmallWorld` deliberately comes from the barrel, not `./SmallWorld.js` directly: the whole
// renderer pipeline (WebGL1/2, WebGPU, most render passes) imports `core/index.js` itself, so
// touching `SmallWorld.ts` as the very first module in the graph re-enters that barrel mid-
// evaluation and can reach `AbstractShowcase.ts`'s `extends SmallWorld` before `SmallWorld`'s
// own class declaration has run (a real, previously-latent TDZ crash, not a hypothetical one --
// hit and confirmed live in-browser while building this). Every existing showcase/app avoids it
// by construction, since they always import from this same barrel (or the package root) first.
import {
  SmallWorld,
  Object3D,
  Behavior,
  attachBehavior,
  detachBehavior,
  DirectionalLight,
  PointLight,
  SpotLight,
  AmbientLight,
  AbstractLight,
  AbstractMaterial,
  WireframeMaterial,
  StandardMaterial,
  Color,
} from "../../core/index.js";
import { Grid, Cube } from "../../geometry/index.js";
import { Raycaster, BoundingBox, BoundingSphere } from "../../physix/index.js";
import { BoundingType, CameraStrategyType } from "../../enums/index.js";
import { EngineOptions, BoundingVolume } from "../../interfaces/index.js";
import { Vector2D, Vector3D, MathPool } from "../../math/index.js";

import { OrbitCameraController, OrbitCameraView } from "./OrbitCameraController.js";
import { UndoStack } from "./UndoStack.js";
import { HierarchyPanel } from "./HierarchyPanel.js";
import { PropertyPanel } from "./PropertyPanel.js";
import { ObjectPalette } from "./ObjectPalette.js";
import { PrefabPalette } from "./PrefabPalette.js";
import { ProjectBinding } from "./ProjectBinding.js";
import { TransformGizmo, GizmoMode, GizmoAxis } from "./TransformGizmo.js";
import { LightGizmoManager } from "./LightGizmoManager.js";
import { MapImportPanel } from "./MapImportPanel.js";
import { defaultAsciiMapLegend } from "./AsciiMapLegend.js";
import { GridLevelBuilder } from "../../extensions/grid-builder/index.js";

export interface MakerAppOptions extends EngineOptions {
  hierarchyContainer: HTMLElement;
  propertyContainer: HTMLElement;
  paletteContainer: HTMLElement;
  statusContainer: HTMLElement;
}

interface ObjectTransformSnapshot {
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  worldPosition: Vector3D;
}

interface GizmoDragState {
  axis: GizmoAxis;
  mode: GizmoMode;
  pivot: Vector3D;
  accumulatedDelta: number;
  /** Snapshot of the transforms for every selected object at drag start -- multi-selection moves
   * together with pivot-relative rotation/scaling. One before/after undo command is pushed once the
   * drag ends. */
  before: Map<Object3D, ObjectTransformSnapshot>;
}

interface MarqueeState {
  startX: number;
  startY: number;
  isShift: boolean;
}

/**
 * Maker's orchestrating application class -- see docs/adr/0010-maker-editor-architecture.md.
 * Owns the viewport (a plain `SmallWorld` instance with a manual orbit camera), selection +
 * picking, the undo stack, and wiring between the three panels (Hierarchy/Palette/Property)
 * and the live scene graph. Deliberately does not touch `GadgetInspector` -- see the ADR's
 * "retire only after parity" decision.
 */
export class MakerApp extends SmallWorld {
  private readonly _orbit = new OrbitCameraController();
  private readonly _undo = new UndoStack();
  private readonly _project = new ProjectBinding();
  private readonly _raycaster = new Raycaster();
  /** Off-scene holding pen for "soft deleted" objects: reparenting into it uses `Object3D.add()`'s
   * silent detach path, never `Scene.remove()`'s GPU-resource-disposal notification -- so a
   * delete stays cleanly undoable (the object can be reparented right back) instead of risking
   * disposed buffers coming back broken after an undo. Never added to `this.scene` itself. */
  private readonly _trashBin = new Object3D("MakerTrash");
  private readonly _gizmo = new TransformGizmo();
  private readonly _lightGizmos = new LightGizmoManager();

  /** Insertion-ordered so "the last thing clicked/toggled" (via `Array.from(...).at(-1)`) is
   * well-defined -- `_primary` always mirrors that. */
  private readonly _selection = new Set<Object3D>();
  /** The object the Property panel shows and the gizmo pivots on -- Blender/Unity's "active
   * object" convention. `undefined` iff `_selection` is empty. */
  private _primary: Object3D | undefined;
  /** Read-only alias kept for every pre-multi-select call site that only ever needs "the one
   * relevant object" (gizmo drag math, `attachBehaviorToSelection`, etc.) -- there is
   * deliberately no setter; `selectObject()`/`toggleSelect()`/`_selectMultiple()` are the only
   * ways to change the selection. */
  /** Public read-only access for inspector/testing */
  public get selection(): ReadonlySet<Object3D> {
    return this._selection;
  }
  public get primary(): Object3D | undefined {
    return this._primary;
  }
  public get gizmo(): TransformGizmo {
    return this._gizmo;
  }
  public get lightGizmos(): LightGizmoManager {
    return this._lightGizmos;
  }
  public get orbit(): OrbitCameraController {
    return this._orbit;
  }
  public get undoStack(): UndoStack {
    return this._undo;
  }
  public get cameraBookmarks(): ReadonlyMap<number, OrbitCameraView> {
    return this._cameraBookmarks;
  }

  private get _selected(): Object3D | undefined {
    return this._primary;
  }
  /** Pooled per-selected-object wireframe highlight boxes, indexed by current selection order
   * (not tied to a fixed object) -- reused across `_syncHighlight()` calls so selecting N
   * objects doesn't allocate N new meshes every frame. */
  private readonly _highlightMeshes: Object3D[] = [];
  private static readonly _PRIMARY_HIGHLIGHT_COLOR = new Color(0, 1, 1);
  private static readonly _SECONDARY_HIGHLIGHT_COLOR = new Color(1, 0.7, 0);
  private _hierarchyPanel!: HierarchyPanel;
  private _propertyPanel!: PropertyPanel;
  private _prefabPalette!: PrefabPalette;
  private _hierarchyDirty = true;
  private _gizmoDrag: GizmoDragState | undefined;
  private _gizmoButtons: Record<GizmoMode, HTMLButtonElement> | undefined;
  private _snapButton: HTMLButtonElement | undefined;
  private _marqueeEl!: HTMLElement;
  private _marqueeState: MarqueeState | undefined;
  private _cameraDrag: { lastX: number; lastY: number } | undefined;
  /** In-memory only, per Maker session -- not part of the glTF world format, so it doesn't
   * survive a reload. A quality-of-life navigation aid, not scene content. */
  private readonly _cameraBookmarks = new Map<number, OrbitCameraView>();
  private _bookmarkButtons: Record<number, HTMLButtonElement> | undefined;
  /** Set for the duration of `_captureIsolatedThumbnail()`'s temporary camera reframing --
   * `update()` skips `_orbit.update()` while true so the orbit controller doesn't immediately
   * overwrite the thumbnail shot on the next frame. */
  private _thumbnailCaptureActive = false;

  constructor(private readonly _makerOptions: MakerAppOptions) {
    super(_makerOptions);
  }

  protected override async setupScene(): Promise<void> {
    const grid = new Object3D("EditorGrid");
    grid.geometry = new Grid({ size: 40, divisions: 40 }).getGeometryData();
    grid.material = new WireframeMaterial(new Color(0.3, 0.3, 0.35));
    grid.isVisible = true;
    this.scene.add(grid);

    this.scene.add(new DirectionalLight({ name: "SunLight", intensity: 1.0 }));
    this.scene.add(new AmbientLight({ name: "Fill", intensity: 0.4 }));

    this.scene.add(this._gizmo.root);
    this.scene.add(this._lightGizmos.root);

    this.camera.setStrategy(CameraStrategyType.MANUAL);
    this.camera.position.set(8, 6, 8);
    this._orbit.target.set(0, 0, 0);

    this._marqueeEl = document.createElement("div");
    this._marqueeEl.className = "maker-marquee-box";
    this.canvas.parentElement?.appendChild(this._marqueeEl);

    this._propertyPanel = new PropertyPanel(this._makerOptions.propertyContainer, this._undo, {
      onPropertyChanged: (_obj, propKey): void => {
        if ("name" === propKey) {
          this._hierarchyDirty = true;
          this._hierarchyPanel.refresh();
        }
        this._project.scheduleAutosave(() => this.scene.root);
      },
      onDetachBehavior: (obj, behavior): void => {
        this.detachBehaviorFromObject(obj, behavior);
      },
      onSetMaterial: (obj, material): void => {
        this.setMaterialOnObject(obj, material);
      },
    });
    this._hierarchyPanel = new HierarchyPanel(
      this._makerOptions.hierarchyContainer,
      () => this.scene.root,
      {
        onSelect: (obj, toggle): void => {
          if (toggle) this.toggleSelect(obj);
          else this.selectObject(obj);
        },
        onReparent: (obj, newParent): void => this.reparent(obj, newParent),
        onRename: (obj, newName): void => this.renameObject(obj, newName),
      },
      (obj) =>
        this._highlightMeshes.includes(obj) ||
        obj === this._gizmo.root ||
        this._lightGizmos.isHelperMesh(obj),
    );
    new ObjectPalette(this._makerOptions.paletteContainer, {
      createObject: (factory): void => this.addObject(factory()),
      attachBehavior: (factory): void => this.attachBehaviorToSelection(factory),
    });
    this._prefabPalette = new PrefabPalette(this._makerOptions.paletteContainer, {
      saveSelectionAsPrefab: (name): void => this._saveSelectionAsPrefab(name),
      instantiate: (name): void => this._instantiatePrefab(name),
    });
    new MapImportPanel(this._makerOptions.paletteContainer, (mapData): void => {
      void this._importAsciiMap(mapData);
    });

    this._project.onDirtyChange((dirty) => {
      this._makerOptions.statusContainer.textContent = dirty ? "Unsaved changes…" : "Saved";
    });
    this._setupProjectToolbar();
    this._setupSelectionToolbar();
    this._setupCameraBookmarkToolbar();
    this._setupGizmoToolbar();

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    window.addEventListener("pointermove", (e) => this._onWindowPointerMove(e));
    window.addEventListener("pointerup", (e) => this._onWindowPointerUp(e));
    window.addEventListener("keydown", (e) => this._onMakerKeyDown(e));

    // Prevent wheel scrolling on sidebars/panels from zooming the 3D editor viewport
    const isolateWheel = (el: HTMLElement | null | undefined): void => {
      el?.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    };
    isolateWheel(this._makerOptions.hierarchyContainer);
    isolateWheel(this._makerOptions.propertyContainer);
    isolateWheel(this._makerOptions.paletteContainer);
    isolateWheel(this._makerOptions.statusContainer);
    isolateWheel(this._makerOptions.hierarchyContainer?.closest(".maker-sidebar"));
    isolateWheel(this._makerOptions.propertyContainer?.closest(".maker-sidebar"));
    if (typeof document !== "undefined") {
      document.querySelectorAll(".maker-sidebar, .tool-header, .maker-status").forEach((el) => {
        isolateWheel(el as HTMLElement);
      });
    }

    this._hierarchyPanel.refresh();
  }

  private _setupProjectToolbar(): void {
    const button = document.createElement("button");
    button.className = "maker-palette-btn";
    button.textContent = "📁 Bind Project Folder";
    button.addEventListener("click", (): void => {
      void (async (): Promise<void> => {
        const bound = await this._project.bind();
        if (!bound) {
          this._makerOptions.statusContainer.textContent =
            "File System Access API unavailable or cancelled";
          return;
        }
        // Merge-in rather than replace: keeps the scope small for Phase 1 -- a full "close and
        // reopen a project" flow (clearing existing content first) is a later-phase concern.
        const loadedRoot = await this._project.load();
        if (loadedRoot) {
          for (const child of [...loadedRoot.children]) {
            this.addObject(child);
          }
        }
        await this._refreshPrefabList();
        this._makerOptions.statusContainer.textContent = "Saved";
      })();
    });
    this._makerOptions.paletteContainer.prepend(button);
  }

  private async _refreshPrefabList(): Promise<void> {
    const names = await this._project.listPrefabs();
    const entries = await Promise.all(
      names.map(async (name) => {
        const thumbnailDataUrl = await this._project.loadPrefabThumbnail(name);
        return thumbnailDataUrl ? { name, thumbnailDataUrl } : { name };
      }),
    );
    this._prefabPalette.setEntries(entries);
  }

  private _saveSelectionAsPrefab(name: string): void {
    const obj = this._selected;
    if (!obj) return;
    void (async (): Promise<void> => {
      const saved = await this._project.savePrefab(name, obj);
      if (saved) {
        const thumbnail = await this._captureIsolatedThumbnail(obj);
        if (thumbnail) await this._project.savePrefabThumbnail(name, thumbnail);
      }
      this._makerOptions.statusContainer.textContent = saved
        ? `Saved prefab "${name}"`
        : "Bind a project folder first to save prefabs";
      if (saved) await this._refreshPrefabList();
    })();
  }

  /** Walks up from `obj` to whichever ancestor is a direct child of the scene root -- the unit
   * `_captureIsolatedThumbnail()` keeps visible while hiding every other top-level object. */
  private _topLevelAncestor(obj: Object3D): Object3D {
    let node = obj;
    while (node.parent && node.parent !== this.scene.root) node = node.parent;
    return node;
  }

  private _boundsToAabb(bounds: BoundingVolume): { min: Vector3D; max: Vector3D } | undefined {
    if (BoundingType.BOX === bounds.type) {
      const box = bounds as BoundingBox;
      return { min: box.min.clone(), max: box.max.clone() };
    }
    if (BoundingType.SPHERE === bounds.type) {
      const sphere = bounds as BoundingSphere;
      const r = new Vector3D(sphere.radius, sphere.radius, sphere.radius);
      return { min: sphere.center.clone().sub(r), max: sphere.center.clone().add(r) };
    }
    return undefined;
  }

  /** Combined world-space AABB of `obj`'s own bounds plus every descendant's -- a prefab is
   * often more than one mesh (a barrel + its lid, a lamp + its glass), so framing on just `obj`
   * itself would clip the rest. @returns undefined if nothing in the subtree carries geometry. */
  private _computeSubtreeWorldBounds(obj: Object3D): { min: Vector3D; max: Vector3D } | undefined {
    obj.updateMatrixWorld();
    let min: Vector3D | undefined;
    let max: Vector3D | undefined;
    const visit = (node: Object3D): void => {
      if (node.geometry) {
        node.computeBounds();
        const aabb = node.bounds && this._boundsToAabb(node.bounds);
        if (aabb) {
          min = min
            ? new Vector3D(
                Math.min(min.x, aabb.min.x),
                Math.min(min.y, aabb.min.y),
                Math.min(min.z, aabb.min.z),
              )
            : aabb.min;
          max = max
            ? new Vector3D(
                Math.max(max.x, aabb.max.x),
                Math.max(max.y, aabb.max.y),
                Math.max(max.z, aabb.max.z),
              )
            : aabb.max;
        }
      }
      for (const child of node.children) visit(child);
    };
    visit(obj);
    return min && max ? { min, max } : undefined;
  }

  /** Points the camera at `obj`'s combined subtree bounds from a fixed 3/4 angle, distance scaled
   * to the bounds' size. Falls back to a default distance around the object's own position if it
   * (and its subtree) carries no geometry at all -- an empty group is still worth a thumbnail
   * showing roughly where its pivot sits, not a hard failure. */
  private _frameCameraOn(obj: Object3D): void {
    const aabb = this._computeSubtreeWorldBounds(obj);
    let center: Vector3D;
    let radius: number;
    if (aabb) {
      center = aabb.min.clone().add(aabb.max).scale(0.5);
      radius = aabb.max.clone().sub(aabb.min).length() / 2;
    } else {
      obj.updateMatrixWorld();
      center = obj.getWorldPosition();
      radius = 1;
    }
    const distance = Math.max(1, radius * 2.2);
    const direction = new Vector3D(1, 0.75, 1).normalize();
    this.camera.position.copyFrom(center.clone().add(direction.scale(distance)));
    this.camera.target.copyFrom(center);
  }

  /** Captures a PNG snapshot of just `obj` (and its subtree) in isolation for a prefab
   * thumbnail: hides the gizmo, the selection highlight boxes, and every OTHER top-level scene
   * object except lights (so unrelated level content doesn't show up in frame, but the shot
   * isn't left completely unlit), then reframes the camera on `obj`'s own bounds -- a dedicated
   * shot, not whatever the user happened to be looking at.
   * Pauses the orbit camera controller for the duration (`_thumbnailCaptureActive`, checked in
   * `update()`) so it doesn't immediately overwrite this temporary framing on the next tick.
   *
   * Waits two `requestAnimationFrame`s (the first only guarantees the visibility/camera changes
   * are *scheduled*; the second is what actually runs after the browser has painted a frame with
   * them applied) before reading the canvas, then restores everything -- visibility, camera
   * position/target, and the orbit controller's own view state (`OrbitCameraController.getView()`/
   * `setView()`, the same snapshot mechanism camera bookmarks use).
   *
   * Races that against a 1s timeout: a tab that loses visibility right after the click can pause
   * `requestAnimationFrame` indefinitely (real browser behavior, not just a test artifact), which
   * would otherwise hang every step after this one (the status text, the prefab list refresh)
   * forever, not just silently skip the thumbnail.
   * @returns undefined if the canvas can't be read, or the timeout wins, rather than throwing --
   * a missing thumbnail is cosmetic, not worth failing the whole "Save as Prefab" action over.
   */
  private _captureIsolatedThumbnail(obj: Object3D): Promise<string | undefined> {
    const wasGizmoVisible = this._gizmo.root.isVisible;
    const wasLightGizmosVisible = this._lightGizmos.root.isVisible;
    const wasHighlightVisible = this._highlightMeshes.map((mesh) => mesh.isVisible);
    this._gizmo.root.isVisible = false;
    this._lightGizmos.root.isVisible = false;
    for (const mesh of this._highlightMeshes) mesh.isVisible = false;

    const topAncestor = this._topLevelAncestor(obj);
    // Scene lights (SunLight/Fill, added at the same top level as anything the palette places)
    // must stay visible -- hiding them along with everything else would leave the isolated shot
    // completely unlit.
    const hiddenSiblings = this.scene.root.children.filter(
      (child) =>
        child !== topAncestor &&
        !this._highlightMeshes.includes(child) &&
        child !== this._gizmo.root &&
        child !== this._lightGizmos.root &&
        !this._lightGizmos.isHelperMesh(child) &&
        !(child instanceof AbstractLight),
    );
    const wasSiblingVisible = hiddenSiblings.map((child) => child.isVisible);
    for (const child of hiddenSiblings) child.isVisible = false;

    const savedView = this._orbit.getView();
    const savedCameraPosition = this.camera.position.clone();
    const savedCameraTarget = this.camera.target.clone();
    this._thumbnailCaptureActive = true;
    this._frameCameraOn(obj);

    const restore = (): void => {
      this._thumbnailCaptureActive = false;
      this._orbit.setView(savedView);
      this.camera.position.copyFrom(savedCameraPosition);
      this.camera.target.copyFrom(savedCameraTarget);
      this._gizmo.root.isVisible = wasGizmoVisible;
      this._lightGizmos.root.isVisible = wasLightGizmosVisible;
      this._highlightMeshes.forEach((mesh, i) => {
        mesh.isVisible = wasHighlightVisible[i]!;
      });
      hiddenSiblings.forEach((child, i) => {
        child.isVisible = wasSiblingVisible[i]!;
      });
    };

    const capture = new Promise<string | undefined>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            resolve(this.canvas.toDataURL("image/png"));
          } catch {
            resolve(undefined);
          }
        });
      });
    });
    const timeout = new Promise<undefined>((resolve) => {
      setTimeout(() => resolve(undefined), 1000);
    });

    return Promise.race([capture, timeout]).then((result) => {
      restore();
      return result;
    });
  }

  private _instantiatePrefab(name: string): void {
    void (async (): Promise<void> => {
      const instance = await this._project.loadPrefab(name);
      if (instance) this.addObject(instance);
    })();
  }

  /** Bridges MapGenerator's ASCII/`GridLevelBuilder` pipeline into Maker (ADR 0010 Phase 2C):
   * builds the map directly into the live scene, then wraps whatever `GridLevelBuilder` added as
   * a single undo step -- it adds objects via `scene.add()` itself, so there is nothing to defer
   * the way `addObject()` normally does; capturing the before/after child sets is what makes it
   * undoable after the fact. Rough starting scaffold, not a finished level -- see
   * `AsciiMapLegend`'s doc comment. */
  private async _importAsciiMap(mapData: string): Promise<void> {
    const before = new Set(this.scene.root.children);
    await new GridLevelBuilder().build(this.scene, mapData, {
      legend: defaultAsciiMapLegend(),
      defaultFloorMaterial: new StandardMaterial({ color: new Color(0.4, 0.4, 0.42) }),
    });
    const added = this.scene.root.children.filter((child) => !before.has(child));
    if (0 === added.length) return;

    this._undo.execute({
      label: `Import ASCII Map (${added.length} objects)`,
      redo: () => {
        for (const obj of added) this.scene.add(obj);
        this._hierarchyDirty = true;
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        for (const obj of added) this._trashBin.add(obj);
        this._hierarchyDirty = true;
        this._project.scheduleAutosave(() => this.scene.root);
      },
      discard: () => {
        for (const obj of added) this._disposeTrashedObject(obj);
      },
    });
  }

  /** Duplicate/Group buttons -- mirrors the `Ctrl/Cmd+D`/`Ctrl/Cmd+G` shortcuts handled in
   * `_onMakerKeyDown`. Both silently no-op with nothing selected, same as the palette's other
   * selection-dependent actions (e.g. "Save as Prefab"). */
  private _setupSelectionToolbar(): void {
    const row = document.createElement("div");
    row.className = "maker-gizmo-toolbar";

    const duplicate = document.createElement("button");
    duplicate.className = "maker-palette-btn";
    duplicate.textContent = "⧉ Duplicate (Ctrl+D)";
    duplicate.addEventListener("click", (): void => this.duplicateSelection());
    row.appendChild(duplicate);

    const group = document.createElement("button");
    group.className = "maker-palette-btn";
    group.textContent = "▤ Group (Ctrl+G)";
    group.addEventListener("click", (): void => this.groupSelection());
    row.appendChild(group);

    const ground = document.createElement("button");
    ground.className = "maker-palette-btn";
    ground.textContent = "⬇ Ground (End)";
    ground.title = "Snap selected object(s) to floor level (End)";
    ground.addEventListener("click", (): void => this.snapSelectionToGround());
    row.appendChild(ground);

    this._makerOptions.paletteContainer.prepend(row);
  }

  /** Nine numbered viewport-view slots -- mirrors the `1`-`9`/`Ctrl+1`-`9` shortcuts handled in
   * `_onMakerKeyDown`. Left-click jumps to a saved view (no-op if the slot is empty);
   * right-click saves the current view into it, same "left acts, right configures" split as
   * Unity/Unreal's numpad camera bookmarks, adapted to mouse-only use. */
  private _setupCameraBookmarkToolbar(): void {
    const row = document.createElement("div");
    row.className = "maker-gizmo-toolbar";
    const buttons: Partial<Record<number, HTMLButtonElement>> = {};
    for (let slot = 1; slot <= 9; slot++) {
      const button = document.createElement("button");
      button.className = "maker-palette-btn";
      button.textContent = `📷${slot}`;
      button.title = "Left-click: jump to view. Right-click: save current view here.";
      button.addEventListener("click", (): void => this.jumpToCameraBookmark(slot));
      button.addEventListener("contextmenu", (e: MouseEvent): void => {
        e.preventDefault();
        this.saveCameraBookmark(slot);
      });
      row.appendChild(button);
      buttons[slot] = button;
    }
    this._bookmarkButtons = buttons as Record<number, HTMLButtonElement>;
    this._makerOptions.paletteContainer.prepend(row);
  }

  /** Saves the current viewport view into bookmark `slot` (1-9), overwriting whatever was
   * there. */
  public saveCameraBookmark(slot: number): void {
    this._cameraBookmarks.set(slot, this._orbit.getView());
    this._bookmarkButtons?.[slot]?.classList.add("active");
  }

  /** Jumps to bookmark `slot`, if one has been saved -- silent no-op otherwise. */
  public jumpToCameraBookmark(slot: number): void {
    const view = this._cameraBookmarks.get(slot);
    if (view) this._orbit.setView(view);
  }

  /** Move/Rotate/Scale mode buttons -- mirrors the `W`/`E`/`R` shortcuts handled in
   * `_onMakerKeyDown`, Blender/Godot/Unity convention. */
  private _setupGizmoToolbar(): void {
    const row = document.createElement("div");
    row.className = "maker-gizmo-toolbar";
    const buttons: Partial<Record<GizmoMode, HTMLButtonElement>> = {};
    const specs: { mode: GizmoMode; label: string }[] = [
      { mode: "translate", label: "Move (W)" },
      { mode: "rotate", label: "Rotate (E)" },
      { mode: "scale", label: "Scale (R)" },
    ];
    for (const { mode, label } of specs) {
      const button = document.createElement("button");
      button.className = "maker-palette-btn";
      button.textContent = label;
      button.addEventListener("click", (): void => this._setGizmoMode(mode));
      row.appendChild(button);
      buttons[mode] = button;
    }
    this._gizmoButtons = buttons as Record<GizmoMode, HTMLButtonElement>;

    const snapBtn = document.createElement("button");
    snapBtn.className = "maker-palette-btn active";
    snapBtn.title = "Toggle grid/angle snapping (X). Use [ and ] to change grid size.";
    snapBtn.addEventListener("click", (): void => {
      this.toggleSnap();
    });
    row.appendChild(snapBtn);
    this._snapButton = snapBtn;
    this._updateSnapButton();

    const decGrid = document.createElement("button");
    decGrid.className = "maker-palette-btn";
    decGrid.textContent = "[-]";
    decGrid.title = "Decrease grid snap size ([)";
    decGrid.addEventListener("click", (): void => {
      this.stepGrid(-1);
    });
    row.appendChild(decGrid);

    const incGrid = document.createElement("button");
    incGrid.className = "maker-palette-btn";
    incGrid.textContent = "[+]";
    incGrid.title = "Increase grid snap size (])";
    incGrid.addEventListener("click", (): void => {
      this.stepGrid(1);
    });
    row.appendChild(incGrid);

    this._makerOptions.paletteContainer.prepend(row);
    this._setGizmoMode("translate");
  }

  public toggleSnap(): boolean {
    const enabled = this._gizmo.toggleSnap();
    this._updateSnapButton();
    return enabled;
  }

  public stepGrid(dir: 1 | -1): number {
    const step = this._gizmo.stepGrid(dir);
    this._updateSnapButton();
    return step;
  }

  private _updateSnapButton(): void {
    if (!this._snapButton) return;
    this._snapButton.textContent = `🧲 ${this._gizmo.snap.translate}m (X)`;
    this._snapButton.classList.toggle("active", this._gizmo.snap.enabled);
  }

  private _setGizmoMode(mode: GizmoMode): void {
    this._gizmo.setMode(mode);
    if (!this._gizmoButtons) return;
    for (const m of Object.keys(this._gizmoButtons) as GizmoMode[]) {
      this._gizmoButtons[m].classList.toggle("active", m === mode);
    }
  }

  protected override update(deltaTime: number): void {
    // Both would immediately undo `_captureIsolatedThumbnail()`'s temporary camera framing and
    // hidden highlight boxes for that one shot.
    if (!this._thumbnailCaptureActive) {
      this._orbit.update(this.camera, this.input);
      this._syncHighlight();
    }
    if (this._hierarchyDirty) {
      this._hierarchyPanel.refresh();
      this._hierarchyDirty = false;
    }
    this.scene.update(deltaTime);
    this._lightGizmos.update(this.scene.root, this._selection, this.camera);
    this._updateGizmo();
  }

  private _updateGizmo(): void {
    this._gizmo.update(this.camera);
    if (!this._gizmoDrag) return;

    const { axis, mode, pivot, before } = this._gizmoDrag;
    const delta = this._gizmo.computeAxisDelta(
      axis,
      this.input.mouse.dx,
      this.input.mouse.dy,
      this.camera,
    );
    this._gizmoDrag.accumulatedDelta += delta;
    const rawDelta = this._gizmoDrag.accumulatedDelta;
    const isMulti = this._selection.size > 1;

    for (const [obj, snap] of before) {
      if ("translate" === mode) {
        const rawVal = snap.position[axis] + rawDelta;
        obj.position[axis] = this._gizmo.snapValue("translate", rawVal);
      } else if ("rotate" === mode) {
        const rawAngle = snap.rotation[axis] + rawDelta;
        const finalAngle = this._gizmo.snapValue("rotate", rawAngle);
        const angleDelta = finalAngle - snap.rotation[axis];

        obj.rotation[axis] = finalAngle;

        if (isMulti && obj !== this._primary) {
          const offset = snap.worldPosition.clone().sub(pivot);
          const rotated = offset.clone();
          if ("x" === axis) {
            const c = Math.cos(angleDelta);
            const s = Math.sin(angleDelta);
            rotated.y = offset.y * c - offset.z * s;
            rotated.z = offset.y * s + offset.z * c;
          } else if ("y" === axis) {
            const c = Math.cos(angleDelta);
            const s = Math.sin(angleDelta);
            rotated.x = offset.x * c + offset.z * s;
            rotated.z = -offset.x * s + offset.z * c;
          } else if ("z" === axis) {
            const c = Math.cos(angleDelta);
            const s = Math.sin(angleDelta);
            rotated.x = offset.x * c - offset.y * s;
            rotated.y = offset.x * s + offset.y * c;
          }
          const newWorld = pivot.clone().add(rotated);
          if (!obj.parent || obj.parent === this.scene.root) {
            obj.position.copyFrom(newWorld);
          } else {
            const invParent = MathPool.acquireMatrix();
            if (obj.parent.worldMatrix.invert(invParent)) {
              invParent.transformVector(newWorld);
              obj.position.copyFrom(newWorld);
            }
            MathPool.releaseMatrix(invParent);
          }
        }
      } else if ("scale" === mode) {
        const rawScale = snap.scale[axis] + rawDelta;
        const finalScale = this._gizmo.snapValue("scale", rawScale);
        const scaleRatio = snap.scale[axis] > 0.0001 ? finalScale / snap.scale[axis] : 1;

        obj.scale[axis] = finalScale;

        if (isMulti && obj !== this._primary) {
          const offset = snap.worldPosition.clone().sub(pivot);
          offset[axis] *= scaleRatio;
          const newWorld = pivot.clone().add(offset);
          if (!obj.parent || obj.parent === this.scene.root) {
            obj.position.copyFrom(newWorld);
          } else {
            const invParent = MathPool.acquireMatrix();
            if (obj.parent.worldMatrix.invert(invParent)) {
              invParent.transformVector(newWorld);
              obj.position.copyFrom(newWorld);
            }
            MathPool.releaseMatrix(invParent);
          }
        }
      }
      obj.updateMatrixWorld();
    }
    this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));

    if (!this.input.mouse.left) this._finishGizmoDrag();
  }

  private _finishGizmoDrag(): void {
    const drag = this._gizmoDrag;
    this._gizmoDrag = undefined;
    if (!drag) return;

    const { axis, mode, before } = drag;
    const after = new Map<Object3D, { position: Vector3D; rotation: Vector3D; scale: Vector3D }>();
    let changed = false;
    for (const [obj, snap] of before) {
      const curPos = obj.position.clone();
      const curRot = obj.rotation.clone();
      const curScale = obj.scale.clone();
      after.set(obj, { position: curPos, rotation: curRot, scale: curScale });
      if (
        curPos.x !== snap.position.x ||
        curPos.y !== snap.position.y ||
        curPos.z !== snap.position.z ||
        curRot.x !== snap.rotation.x ||
        curRot.y !== snap.rotation.y ||
        curRot.z !== snap.rotation.z ||
        curScale.x !== snap.scale.x ||
        curScale.y !== snap.scale.y ||
        curScale.z !== snap.scale.z
      ) {
        changed = true;
      }
    }
    if (!changed) return; // click without drag -- nothing to undo

    const apply = (
      values: Map<Object3D, { position: Vector3D; rotation: Vector3D; scale: Vector3D }>,
    ): void => {
      for (const [obj, transform] of values) {
        obj.position.copyFrom(transform.position);
        obj.rotation.copyFrom(transform.rotation);
        obj.scale.copyFrom(transform.scale);
        obj.updateMatrixWorld();
      }
      this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
      this._project.scheduleAutosave(() => this.scene.root);
    };

    const beforeValues = new Map(
      [...before.entries()].map(([k, v]) => [
        k,
        {
          position: v.position.clone(),
          rotation: v.rotation.clone(),
          scale: v.scale.clone(),
        },
      ]),
    );

    this._undo.execute({
      label: `Gizmo ${mode} ${axis.toUpperCase()}${before.size > 1 ? ` (${before.size})` : ""}`,
      redo: () => apply(after),
      undo: () => apply(beforeValues),
    });
    this._project.scheduleAutosave(() => this.scene.root);
  }

  /** Replaces the entire selection with just `obj` (or clears it for `undefined`) -- a plain
   * click's behavior. See `toggleSelect()` for Shift/Ctrl-click's add/remove-one behavior. */
  public selectObject(obj: Object3D | undefined): void {
    this._selection.clear();
    if (obj) this._selection.add(obj);
    this._primary = obj;
    this._applySelectionChange();
  }

  /** Adds/removes `obj` from the selection without disturbing the rest of it -- Shift/Ctrl-click's
   * behavior, in both the viewport and the Hierarchy panel. The toggled object becomes primary
   * when added; when removed, primary falls back to whichever object was selected most recently
   * (or undefined if the selection is now empty). */
  public toggleSelect(obj: Object3D): void {
    if (this._selection.has(obj)) {
      this._selection.delete(obj);
      this._primary = Array.from(this._selection).at(-1);
    } else {
      this._selection.add(obj);
      this._primary = obj;
    }
    this._applySelectionChange();
  }

  /** Replaces the entire selection with `objs`, the last of which becomes primary -- used after
   * an operation (duplicate, group, undo) that should leave a specific set selected, distinct
   * from `selectObject()`'s single-object contract. */
  private _selectMultiple(objs: Object3D[]): void {
    this._selection.clear();
    for (const obj of objs) this._selection.add(obj);
    this._primary = objs.at(-1);
    this._applySelectionChange();
  }

  private _applySelectionChange(): void {
    this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
    this._hierarchyPanel.setSelected(this._selection);
    this._gizmo.attachTo(this._primary);
    this._syncHighlight();
  }

  private _computeSmartSpawnPosition(obj: Object3D): Vector3D {
    const target = this._orbit.target.clone();
    const rayDir = new Vector3D().copyFrom(target).sub(this.camera.position).normalize();

    let spawnX = target.x;
    let spawnZ = target.z;

    if (Math.abs(rayDir.y) > 0.001) {
      const t = -this.camera.position.y / rayDir.y;
      if (t > 0 && t < 100) {
        spawnX = this.camera.position.x + rayDir.x * t;
        spawnZ = this.camera.position.z + rayDir.z * t;
      }
    }

    if (this._gizmo.snap.enabled) {
      spawnX = this._gizmo.snapValue("translate", spawnX);
      spawnZ = this._gizmo.snapValue("translate", spawnZ);
    }

    let spawnY = 0;
    if (obj instanceof PointLight) {
      spawnY = 2.0;
    } else if (obj instanceof DirectionalLight) {
      spawnY = 5.0;
    } else if (obj instanceof SpotLight) {
      spawnY = 3.0;
    } else if (obj instanceof AmbientLight) {
      spawnY = 1.0;
    } else if (obj.geometry) {
      obj.computeBounds();
      if (obj.bounds && BoundingType.BOX === obj.bounds.type) {
        const box = obj.bounds as BoundingBox;
        spawnY = -box.min.y;
      }
    }

    return new Vector3D(spawnX, spawnY, spawnZ);
  }

  /** Releases an object's GPU resources for real, once we know for certain it can never be
   * brought back by `undo()`/`redo()` again (its owning `UndoCommand` was just permanently
   * discarded by `UndoStack` -- see `UndoCommand.discard()`). No-op if `obj` isn't currently
   * parked in `_trashBin` (its command may have been discarded while `redo()`, not `undo()`, was
   * the side last applied, i.e. it's live in the scene, not trashed).
   *
   * `_trashBin` is deliberately never added to `this.scene`, so `Scene`'s GPU-disposal
   * notification (`Object3D.pendingRemovalSink`) never fires for objects parked there -- that's
   * what keeps a soft-deleted object cheap to undo. Briefly routing it through the real scene
   * (`add` then immediately `remove`, both synchronous, no frame renders in between) is the only
   * way to trigger that same real disposal without inventing a second, parallel mechanism. */
  private _disposeTrashedObject(obj: Object3D): void {
    if (obj.parent !== this._trashBin) return;
    this.scene.add(obj);
    this.scene.remove(obj);
  }

  public addObject(obj: Object3D): void {
    if (0 === obj.position.x && 0 === obj.position.y && 0 === obj.position.z) {
      const smartPos = this._computeSmartSpawnPosition(obj);
      obj.position.copyFrom(smartPos);
    }

    this._undo.execute({
      label: `Add ${obj.name}`,
      redo: () => {
        this.scene.add(obj);
        this._hierarchyDirty = true;
        this.selectObject(obj);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        this._trashBin.add(obj);
        this._hierarchyDirty = true;
        if (this._selected === obj) this.selectObject(undefined);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      discard: () => this._disposeTrashedObject(obj),
    });
  }

  /** Deletes every currently selected object as one batch undo step. Works the same for a single
   * selected object as it did before multi-selection existed. */
  public deleteSelection(): void {
    const objs = Array.from(this._selection).filter((obj) => obj.parent);
    if (0 === objs.length) return;
    const parents = objs.map((obj) => obj.parent!);

    this._undo.execute({
      label: `Delete ${objs.length} object${objs.length > 1 ? "s" : ""}`,
      redo: () => {
        for (const obj of objs) this._trashBin.add(obj);
        this._hierarchyDirty = true;
        this.selectObject(undefined);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        objs.forEach((obj, i) => parents[i]!.add(obj));
        this._hierarchyDirty = true;
        this._selectMultiple(objs);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      discard: () => {
        for (const obj of objs) this._disposeTrashedObject(obj);
      },
    });
  }

  public reparent(obj: Object3D, newParent: Object3D): void {
    const oldParent = obj.parent;
    if (!oldParent || oldParent === newParent) return;
    this._undo.execute({
      label: `Move ${obj.name}`,
      redo: () => {
        newParent.add(obj);
        this._hierarchyDirty = true;
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        oldParent.add(obj);
        this._hierarchyDirty = true;
        this._project.scheduleAutosave(() => this.scene.root);
      },
    });
  }

  public renameObject(obj: Object3D, newName: string): void {
    const oldName = obj.name;
    if (oldName === newName) return;
    this._undo.execute({
      label: `Rename to "${newName}"`,
      redo: () => {
        obj.name = newName;
        this._hierarchyDirty = true;
        this._hierarchyPanel.refresh();
        if (this._primary === obj) {
          this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        }
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        obj.name = oldName;
        this._hierarchyDirty = true;
        this._hierarchyPanel.refresh();
        if (this._primary === obj) {
          this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        }
        this._project.scheduleAutosave(() => this.scene.root);
      },
    });
  }

  /** Clones every selected object (via `Object3D.clone()`) and inserts each copy as a sibling
   * right next to its original, then selects the whole new set of copies as one batch undo step.
   * Works the same for a single selected object as it did before multi-selection existed. */
  public duplicateSelection(): void {
    const objs = Array.from(this._selection).filter((obj) => obj.parent);
    if (0 === objs.length) return;
    const clones = objs.map((obj) => {
      const clone = obj.clone();
      clone.name = obj.name ? `${obj.name} Copy` : clone.name;
      return { parent: obj.parent!, clone };
    });

    this._undo.execute({
      label: `Duplicate ${objs.length} object${objs.length > 1 ? "s" : ""}`,
      redo: () => {
        for (const { parent, clone } of clones) parent.add(clone);
        this._hierarchyDirty = true;
        this._selectMultiple(clones.map((c) => c.clone));
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        for (const { clone } of clones) this._trashBin.add(clone);
        this._hierarchyDirty = true;
        this._selectMultiple(objs);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      discard: () => {
        for (const { clone } of clones) this._disposeTrashedObject(clone);
      },
    });
  }

  /** Groups the current selection into a new empty parent. A single selected object is wrapped
   * at its own current world transform -- the group takes the object's old local transform, the
   * object resets to identity within it, Blender/Unity's "Group Selected". Multiple selected
   * objects go through `_groupMultiple()` instead. */
  public groupSelection(): void {
    const objs = Array.from(this._selection);
    if (0 === objs.length) return;
    if (1 === objs.length) {
      this._groupSingle(objs[0]!);
      return;
    }
    this._groupMultiple(objs);
  }

  private _groupSingle(obj: Object3D): void {
    const parent = obj.parent;
    if (!parent) return;

    const beforePos = obj.position.clone();
    const beforeRot = obj.rotation.clone();
    const beforeScale = obj.scale.clone();
    const group = new Object3D("Group");
    group.position.copyFrom(beforePos);
    group.rotation.copyFrom(beforeRot);
    group.scale.copyFrom(beforeScale);

    this._undo.execute({
      label: `Group ${obj.name}`,
      redo: () => {
        parent.add(group);
        group.updateMatrixWorld(); // group.worldMatrix must be current before children re-derive
        // their own worldMatrix from it below -- a freshly-added Object3D starts at identity.
        group.add(obj);
        obj.position.set(0, 0, 0);
        obj.rotation.set(0, 0, 0);
        obj.scale.set(1, 1, 1);
        obj.updateMatrixWorld();
        this._hierarchyDirty = true;
        this.selectObject(group);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        parent.add(obj);
        obj.position.copyFrom(beforePos);
        obj.rotation.copyFrom(beforeRot);
        obj.scale.copyFrom(beforeScale);
        obj.updateMatrixWorld();
        this._trashBin.add(group);
        this._hierarchyDirty = true;
        this.selectObject(obj);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      discard: () => this._disposeTrashedObject(group),
    });
  }

  /** Wraps several selected objects (possibly with different original parents) together under
   * one new group, added directly to the scene root and positioned at their centroid. Each
   * object's own position is adjusted to preserve its exact world position; rotation/scale are
   * left untouched, since the group itself gets identity rotation/scale -- that keeps the math to
   * a position-only offset instead of a full transform decomposition. Undoing restores each
   * object to its own original parent and position. */
  private _groupMultiple(objs: Object3D[]): void {
    const snapshots = objs.map((obj) => ({
      obj,
      parent: obj.parent!,
      position: obj.position.clone(),
    }));

    for (const obj of objs) obj.updateMatrixWorld();
    const worldPositions = objs.map((obj) => obj.getWorldPosition());
    const centroid = new Vector3D();
    for (const p of worldPositions) centroid.add(p);
    centroid.scale(1 / objs.length);

    const group = new Object3D("Group");
    group.position.copyFrom(centroid);

    this._undo.execute({
      label: `Group ${objs.length} objects`,
      redo: () => {
        this.scene.add(group);
        group.updateMatrixWorld(); // see the comment in _groupSingle()'s redo -- same reason.
        objs.forEach((obj, i) => {
          group.add(obj);
          obj.position.copyFrom(worldPositions[i]!.clone().sub(centroid));
          obj.updateMatrixWorld();
        });
        this._hierarchyDirty = true;
        this.selectObject(group);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        for (const s of snapshots) {
          s.parent.add(s.obj);
          s.obj.position.copyFrom(s.position);
          s.obj.updateMatrixWorld();
        }
        this._trashBin.add(group);
        this._hierarchyDirty = true;
        this._selectMultiple(objs);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      discard: () => this._disposeTrashedObject(group),
    });
  }

  public attachBehaviorToSelection(factory: () => Behavior): void {
    const objs = Array.from(this._selection);
    if (0 === objs.length) return;
    const sample = factory();
    const behaviorName = sample.constructor.name;
    const attached = new Map<Object3D, Behavior>();
    for (const obj of objs) {
      attached.set(obj, factory());
    }

    this._undo.execute({
      label: `Attach ${behaviorName}${objs.length > 1 ? ` (${objs.length})` : ""}`,
      redo: () => {
        for (const [obj, behavior] of attached) {
          attachBehavior(obj.behaviors, behavior, obj);
        }
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        for (const [obj, behavior] of attached) {
          detachBehavior(obj.behaviors, behavior);
        }
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
    });
  }

  public detachBehaviorFromObject(obj: Object3D, behavior: Behavior): void {
    const behaviorName = behavior.constructor.name;
    this._undo.execute({
      label: `Detach ${behaviorName}`,
      redo: () => {
        detachBehavior(obj.behaviors, behavior);
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        attachBehavior(obj.behaviors, behavior, obj);
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
    });
  }

  public setMaterialOnObject(obj: Object3D, newMaterial: AbstractMaterial | undefined): void {
    const oldMaterial = obj.material;
    const label = newMaterial ? `Set ${newMaterial.constructor.name}` : "Remove Material";
    this._undo.execute({
      label,
      redo: () => {
        obj.material = newMaterial;
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        obj.material = oldMaterial;
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
    });
  }

  private _onPointerDown(event: PointerEvent): void {
    // Camera Orbit: Right-click (2), Middle-click (1), Alt+Left-click, or Mac Ctrl+Click
    const isOrbit =
      2 === event.button ||
      1 === event.button ||
      event.buttons === 2 ||
      event.buttons === 4 ||
      (0 === event.button && event.altKey) ||
      (0 === event.button && event.ctrlKey && !event.metaKey && !event.shiftKey);
    if (isOrbit) {
      this._cameraDrag = { lastX: event.clientX, lastY: event.clientY };
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture unavailable or unattached
      }
      event.preventDefault();
      return;
    }

    if (0 !== event.button) return; // Left click only for picking / gizmo / marquee
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector2D(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const gizmoAxis = this._gizmo.pickAxis(ndc, this.camera);
    if (gizmoAxis && this._primary) {
      const mode = this._gizmo.mode;
      this._primary.updateMatrixWorld();
      const pivot = this._primary.getWorldPosition();
      const before = new Map<Object3D, ObjectTransformSnapshot>();
      for (const obj of this._selection) {
        obj.updateMatrixWorld();
        before.set(obj, {
          position: obj.position.clone(),
          rotation: obj.rotation.clone(),
          scale: obj.scale.clone(),
          worldPosition: obj.getWorldPosition(),
        });
      }
      this._gizmoDrag = {
        axis: gizmoAxis,
        mode,
        pivot,
        accumulatedDelta: 0,
        before,
      };
      return; // Gizmo handle grabbed -- don't also run normal object picking below.
    }

    this._raycaster.setFromCamera(ndc, this.camera);
    const pickable: Object3D[] = [];
    this._collectPickable(this.scene.root, pickable);
    this._lightGizmos.collectPickables(pickable);
    const hits = this._raycaster.intersectObjects(pickable, true);
    const hitObj = 0 < hits.length ? hits[0]!.object : undefined;

    if (hitObj) {
      const targetObj = this._lightGizmos.getLightForObject(hitObj) ?? hitObj;
      if (event.shiftKey || event.metaKey) {
        this.toggleSelect(targetObj);
      } else {
        this.selectObject(targetObj);
      }
    } else {
      // Empty space clicked with primary left-click -- begin marquee selection
      this._marqueeState = {
        startX: event.clientX,
        startY: event.clientY,
        isShift: event.shiftKey || event.metaKey,
      };
    }
  }

  private _onWindowPointerMove(event: PointerEvent): void {
    if (this._cameraDrag) {
      const dx = event.clientX - this._cameraDrag.lastX;
      const dy = event.clientY - this._cameraDrag.lastY;
      this._cameraDrag.lastX = event.clientX;
      this._cameraDrag.lastY = event.clientY;
      this._orbit.rotate(dx, dy);
      return;
    }

    if (!this._marqueeState) return;
    const rect = this.canvas.getBoundingClientRect();
    const minX = Math.max(rect.left, Math.min(this._marqueeState.startX, event.clientX));
    const maxX = Math.min(rect.right, Math.max(this._marqueeState.startX, event.clientX));
    const minY = Math.max(rect.top, Math.min(this._marqueeState.startY, event.clientY));
    const maxY = Math.min(rect.bottom, Math.max(this._marqueeState.startY, event.clientY));
    const w = maxX - minX;
    const h = maxY - minY;

    if (w > 4 || h > 4) {
      this._marqueeEl.style.display = "block";
      this._marqueeEl.style.left = `${minX - rect.left}px`;
      this._marqueeEl.style.top = `${minY - rect.top}px`;
      this._marqueeEl.style.width = `${w}px`;
      this._marqueeEl.style.height = `${h}px`;
    }
  }

  private _onWindowPointerUp(event: PointerEvent): void {
    if (this._cameraDrag) {
      this._cameraDrag = undefined;
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture already released or unattached
      }
      return;
    }

    if (!this._marqueeState) return;
    const { startX, startY, isShift } = this._marqueeState;
    this._marqueeState = undefined;
    this._marqueeEl.style.display = "none";

    const rect = this.canvas.getBoundingClientRect();
    const minX = Math.max(rect.left, Math.min(startX, event.clientX));
    const maxX = Math.min(rect.right, Math.max(startX, event.clientX));
    const minY = Math.max(rect.top, Math.min(startY, event.clientY));
    const maxY = Math.min(rect.bottom, Math.max(startY, event.clientY));
    const w = maxX - minX;
    const h = maxY - minY;

    if (w > 4 || h > 4) {
      const candidates: Object3D[] = [];
      this._collectPickable(this.scene.root, candidates);
      const matched: Object3D[] = [];

      for (const obj of candidates) {
        obj.updateMatrixWorld();
        if (this._isObjectInScreenRect(obj, minX, maxX, minY, maxY, rect)) {
          matched.push(obj);
        }
      }

      if (isShift) {
        for (const obj of matched) this._selection.add(obj);
        if (matched.length > 0) this._primary = matched.at(-1);
        this._applySelectionChange();
      } else {
        this._selectMultiple(matched);
      }
    } else {
      if (!isShift) {
        this.selectObject(undefined);
      }
    }
  }

  private _isObjectInScreenRect(
    obj: Object3D,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    rect: DOMRect,
  ): boolean {
    const pointsToTest: Vector3D[] = [];
    if (obj.bounds) {
      if (BoundingType.BOX === obj.bounds.type) {
        const box = obj.bounds as BoundingBox;
        pointsToTest.push(
          new Vector3D(box.min.x, box.min.y, box.min.z),
          new Vector3D(box.max.x, box.min.y, box.min.z),
          new Vector3D(box.min.x, box.max.y, box.min.z),
          new Vector3D(box.max.x, box.max.y, box.min.z),
          new Vector3D(box.min.x, box.min.y, box.max.z),
          new Vector3D(box.max.x, box.min.y, box.max.z),
          new Vector3D(box.min.x, box.max.y, box.max.z),
          new Vector3D(box.max.x, box.max.y, box.max.z),
        );
      } else if (BoundingType.SPHERE === obj.bounds.type) {
        const s = obj.bounds as BoundingSphere;
        pointsToTest.push(
          s.center.clone(),
          s.center.clone().add(new Vector3D(s.radius, 0, 0)),
          s.center.clone().add(new Vector3D(-s.radius, 0, 0)),
          s.center.clone().add(new Vector3D(0, s.radius, 0)),
          s.center.clone().add(new Vector3D(0, -s.radius, 0)),
          s.center.clone().add(new Vector3D(0, 0, s.radius)),
          s.center.clone().add(new Vector3D(0, 0, -s.radius)),
        );
      }
    } else {
      pointsToTest.push(obj.getWorldPosition());
    }

    let objMinX = Infinity;
    let objMaxX = -Infinity;
    let objMinY = Infinity;
    let objMaxY = -Infinity;
    let anyInFront = false;

    for (const p of pointsToTest) {
      const ndc = this.camera.viewProjectionMatrix4.transformVector(p.clone());
      if (ndc.z >= -1 && ndc.z <= 1) {
        anyInFront = true;
        const sx = (ndc.x * 0.5 + 0.5) * rect.width + rect.left;
        const sy = (-ndc.y * 0.5 + 0.5) * rect.height + rect.top;
        objMinX = Math.min(objMinX, sx);
        objMaxX = Math.max(objMaxX, sx);
        objMinY = Math.min(objMinY, sy);
        objMaxY = Math.max(objMaxY, sy);
      }
    }

    if (!anyInFront) return false;
    return !(objMaxX < minX || objMinX > maxX || objMaxY < minY || objMinY > maxY);
  }

  /** Mirrors `GadgetInspector`'s own picking scope (visible objects only, own helper meshes
   * excluded) so Maker and the still-live GadgetInspector behave consistently while both exist. */
  private _collectPickable(parent: Object3D, out: Object3D[]): void {
    if (
      this._highlightMeshes.includes(parent) ||
      parent === this._gizmo.root ||
      this._lightGizmos.isHelperMesh(parent)
    ) {
      return;
    }
    if (parent.isVisible) {
      if (parent.geometry) parent.computeBounds();
      out.push(parent);
    }
    for (const child of parent.children) this._collectPickable(child, out);
  }

  private _getOrCreateHighlightMesh(index: number): Object3D {
    let mesh = this._highlightMeshes[index];
    if (!mesh) {
      mesh = new Object3D(`MakerHighlight${index}`);
      mesh.geometry = new Cube({ size: 1 }).getGeometryData();
      mesh.material = new WireframeMaterial(new Color(0, 1, 1));
      mesh.isVisible = false;
      this.scene.add(mesh);
      this._highlightMeshes[index] = mesh;
    }
    return mesh;
  }

  /** Fits `mesh` (a wireframe cube) to `obj`'s current world bounds. @returns Whether a fit was
   * possible -- false (with `mesh` left hidden by the caller) if `obj` has no bounds. */
  private _fitHighlightMesh(obj: Object3D, mesh: Object3D): boolean {
    if (!obj.bounds) return false;
    const epsilon = new Vector3D(0.02, 0.02, 0.02);
    if (BoundingType.BOX === obj.bounds.type) {
      const box = obj.bounds as BoundingBox;
      const size = new Vector3D().copyFrom(box.max).sub(box.min).add(epsilon);
      mesh.position.copyFrom(box.center);
      mesh.scale.copyFrom(size);
      mesh.updateMatrixWorld();
      return true;
    }
    if (BoundingType.SPHERE === obj.bounds.type) {
      const sphere = obj.bounds as BoundingSphere;
      const diameter = sphere.radius * 2;
      const size = new Vector3D(diameter, diameter, diameter).add(epsilon);
      mesh.position.copyFrom(sphere.center);
      mesh.scale.copyFrom(size);
      mesh.updateMatrixWorld();
      return true;
    }
    return false;
  }

  /** One highlight box per selected object, pooled by index -- the primary object's box is cyan,
   * every other selected object's is amber, so it's obvious at a glance which one the gizmo/
   * Property panel are actually driving. */
  private _syncHighlight(): void {
    const objs = Array.from(this._selection);
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i]!;
      const mesh = this._getOrCreateHighlightMesh(i);
      (mesh.material as WireframeMaterial).color.copyFrom(
        obj === this._primary
          ? MakerApp._PRIMARY_HIGHLIGHT_COLOR
          : MakerApp._SECONDARY_HIGHLIGHT_COLOR,
      );
      if (obj.geometry) obj.computeBounds();
      mesh.isVisible = this._fitHighlightMesh(obj, mesh);
    }
    for (let i = objs.length; i < this._highlightMeshes.length; i++) {
      this._highlightMeshes[i]!.isVisible = false;
    }
  }

  private _onMakerKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && "z" === event.key.toLowerCase()) {
      event.preventDefault();
      if (event.shiftKey) this._undo.redo();
      else this._undo.undo();
      this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
      this._hierarchyDirty = true;
      return;
    }
    if ("Delete" === event.key || "Backspace" === event.key) {
      const active = document.activeElement;
      // Don't hijack Backspace while the user is typing into a text field.
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (0 < this._selection.size) {
        event.preventDefault();
        this.deleteSelection();
      }
      return;
    }

    if ("F2" === event.key) {
      const active = document.activeElement;
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (this._primary) {
        event.preventDefault();
        this._hierarchyPanel.startRenaming(this._primary);
        return;
      }
    }

    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && "f" === key) {
      const active = document.activeElement;
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      event.preventDefault();
      this._hierarchyPanel.focusSearch();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && ("d" === key || "g" === key)) {
      const active = document.activeElement;
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (0 === this._selection.size) return;
      event.preventDefault();
      if ("d" === key) this.duplicateSelection();
      else this.groupSelection();
      return;
    }

    if ("x" === key) {
      const active = document.activeElement;
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      this.toggleSnap();
      return;
    }

    const slot = Number(event.key);
    if (Number.isInteger(slot) && slot >= 1 && slot <= 9) {
      const active = document.activeElement;
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (event.altKey) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) this.saveCameraBookmark(slot);
      else this.jumpToCameraBookmark(slot);
      return;
    }

    if ("w" === key || "e" === key || "r" === key) {
      const active = document.activeElement;
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      this._setGizmoMode("w" === key ? "translate" : "e" === key ? "rotate" : "scale");
      return;
    }

    if ("[" === event.key || "]" === event.key) {
      const active = document.activeElement;
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      this.stepGrid("[" === event.key ? -1 : 1);
      return;
    }

    if ("End" === event.key) {
      const active = document.activeElement;
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (0 === this._selection.size) return;
      event.preventDefault();
      this.snapSelectionToGround();
      return;
    }

    if (
      "ArrowLeft" === event.key ||
      "ArrowRight" === event.key ||
      "ArrowUp" === event.key ||
      "ArrowDown" === event.key ||
      "PageUp" === event.key ||
      "PageDown" === event.key
    ) {
      const active = document.activeElement;
      if (
        active &&
        ("INPUT" === active.tagName || "TEXTAREA" === active.tagName || "SELECT" === active.tagName)
      ) {
        return;
      }
      if (0 === this._selection.size) return;
      event.preventDefault();
      this.nudgeSelection(event.key, event.shiftKey, event.altKey);
    }
  }

  /** Snaps selected object(s) so their lowest bounding-box point aligns exactly with the ground (Y = 0). */
  public snapSelectionToGround(): void {
    const objs = Array.from(this._selection);
    if (0 === objs.length) return;

    let minY = Infinity;
    for (const obj of objs) {
      obj.updateMatrixWorld();
      const aabb = this._computeSubtreeWorldBounds(obj);
      if (aabb) {
        minY = Math.min(minY, aabb.min.y);
      } else {
        minY = Math.min(minY, obj.getWorldPosition().y);
      }
    }

    if (!Number.isFinite(minY)) return;
    const dy = -minY;
    if (Math.abs(dy) < 0.0001) return;

    const before = objs.map((obj) => ({ obj, pos: obj.position.clone() }));
    const after = objs.map((obj) => {
      const nextPos = obj.position.clone();
      nextPos.y += dy;
      if (this._gizmo.snap.enabled) {
        nextPos.y = this._gizmo.snapValue("translate", nextPos.y);
      }
      return { obj, pos: nextPos };
    });

    this._undo.execute({
      label: `Snap ${objs.length} object${objs.length > 1 ? "s" : ""} to Ground`,
      redo: () => {
        for (const { obj, pos } of after) {
          obj.position.copyFrom(pos);
          obj.updateMatrixWorld();
        }
        this._updateGizmo();
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        for (const { obj, pos } of before) {
          obj.position.copyFrom(pos);
          obj.updateMatrixWorld();
        }
        this._updateGizmo();
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
    });
  }

  /** Nudges selected object(s) along X/Y/Z axes via arrow keys according to active Gizmo mode (Move/Rotate/Scale) or Alt modifiers. */
  public nudgeSelection(key: string, isShift: boolean, isAlt: boolean = false): void {
    const objs = Array.from(this._selection);
    if (0 === objs.length) return;

    // Alt forces Rotate (or Alt+Shift forces Scale), otherwise follows current gizmo mode
    const mode: GizmoMode = isAlt && isShift ? "scale" : isAlt ? "rotate" : this._gizmo.mode;

    if ("rotate" === mode) {
      const snapAngle = this._gizmo.snap.enabled ? this._gizmo.snap.rotate : Math.PI / 12; // 15 deg
      let rx = 0;
      let ry = 0;
      let rz = 0;

      if ("PageUp" === key || ("ArrowLeft" === key && isShift)) rz = snapAngle;
      else if ("PageDown" === key || ("ArrowRight" === key && isShift)) rz = -snapAngle;
      else if ("ArrowLeft" === key) ry = snapAngle;
      else if ("ArrowRight" === key) ry = -snapAngle;
      else if ("ArrowUp" === key) rx = -snapAngle;
      else if ("ArrowDown" === key) rx = snapAngle;

      if (0 === rx && 0 === ry && 0 === rz) return;

      const before = objs.map((obj) => ({ obj, rot: obj.rotation.clone() }));
      const after = objs.map((obj) => {
        const nextRot = obj.rotation.clone();
        nextRot.x += rx;
        nextRot.y += ry;
        nextRot.z += rz;
        if (this._gizmo.snap.enabled) {
          nextRot.x = this._gizmo.snapValue("rotate", nextRot.x);
          nextRot.y = this._gizmo.snapValue("rotate", nextRot.y);
          nextRot.z = this._gizmo.snapValue("rotate", nextRot.z);
        }
        return { obj, rot: nextRot };
      });

      this._undo.execute({
        label: `Rotate ${objs.length} object${objs.length > 1 ? "s" : ""}`,
        redo: () => {
          for (const { obj, rot } of after) {
            obj.rotation.copyFrom(rot);
            obj.updateMatrixWorld();
          }
          this._updateGizmo();
          this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
          this._project.scheduleAutosave(() => this.scene.root);
        },
        undo: () => {
          for (const { obj, rot } of before) {
            obj.rotation.copyFrom(rot);
            obj.updateMatrixWorld();
          }
          this._updateGizmo();
          this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
          this._project.scheduleAutosave(() => this.scene.root);
        },
      });
      return;
    }

    if ("scale" === mode) {
      const step = this._gizmo.snap.enabled ? this._gizmo.snap.scale : 0.25;
      let sx = 0;
      let sy = 0;
      let sz = 0;

      if ("PageUp" === key || ("ArrowUp" === key && isShift)) sy = step;
      else if ("PageDown" === key || ("ArrowDown" === key && isShift)) sy = -step;
      else if ("ArrowLeft" === key) sx = -step;
      else if ("ArrowRight" === key) sx = step;
      else if ("ArrowUp" === key) sz = -step;
      else if ("ArrowDown" === key) sz = step;

      if (0 === sx && 0 === sy && 0 === sz) return;

      const before = objs.map((obj) => ({ obj, scale: obj.scale.clone() }));
      const after = objs.map((obj) => {
        const nextScale = obj.scale.clone();
        nextScale.x = Math.max(0.01, nextScale.x + sx);
        nextScale.y = Math.max(0.01, nextScale.y + sy);
        nextScale.z = Math.max(0.01, nextScale.z + sz);
        if (this._gizmo.snap.enabled) {
          nextScale.x = this._gizmo.snapValue("scale", nextScale.x);
          nextScale.y = this._gizmo.snapValue("scale", nextScale.y);
          nextScale.z = this._gizmo.snapValue("scale", nextScale.z);
        }
        return { obj, scale: nextScale };
      });

      this._undo.execute({
        label: `Scale ${objs.length} object${objs.length > 1 ? "s" : ""}`,
        redo: () => {
          for (const { obj, scale } of after) {
            obj.scale.copyFrom(scale);
            obj.updateMatrixWorld();
          }
          this._updateGizmo();
          this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
          this._project.scheduleAutosave(() => this.scene.root);
        },
        undo: () => {
          for (const { obj, scale } of before) {
            obj.scale.copyFrom(scale);
            obj.updateMatrixWorld();
          }
          this._updateGizmo();
          this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
          this._project.scheduleAutosave(() => this.scene.root);
        },
      });
      return;
    }

    // Default: Translate mode
    const baseStep = this._gizmo.snap.enabled ? this._gizmo.snap.translate : 0.5;
    const step = baseStep;

    // Camera-cardinal alignment: arrow directions match on-screen visual perspective
    const camFwd = this.camera.target.clone().sub(this.camera.position);
    camFwd.y = 0;
    if (camFwd.lengthSq() < 0.0001) camFwd.set(0, 0, -1);
    else camFwd.normalize();

    let fwdX = 0;
    let fwdZ = 0;
    let rgtX = 0;
    let rgtZ = 0;

    if (Math.abs(camFwd.z) >= Math.abs(camFwd.x)) {
      fwdZ = camFwd.z > 0 ? 1 : -1;
      rgtX = -fwdZ;
    } else {
      fwdX = camFwd.x > 0 ? 1 : -1;
      rgtZ = fwdX;
    }

    let dx = 0;
    let dy = 0;
    let dz = 0;

    if ("PageUp" === key || ("ArrowUp" === key && isShift)) {
      dy = step;
    } else if ("PageDown" === key || ("ArrowDown" === key && isShift)) {
      dy = -step;
    } else if ("ArrowLeft" === key) {
      dx = -rgtX * step;
      dz = -rgtZ * step;
    } else if ("ArrowRight" === key) {
      dx = rgtX * step;
      dz = rgtZ * step;
    } else if ("ArrowUp" === key) {
      dx = fwdX * step;
      dz = fwdZ * step;
    } else if ("ArrowDown" === key) {
      dx = -fwdX * step;
      dz = -fwdZ * step;
    }

    if (0 === dx && 0 === dy && 0 === dz) return;

    const before = objs.map((obj) => ({ obj, pos: obj.position.clone() }));
    const after = objs.map((obj) => {
      const nextPos = obj.position.clone();
      nextPos.x += dx;
      nextPos.y += dy;
      nextPos.z += dz;
      if (this._gizmo.snap.enabled) {
        nextPos.x = this._gizmo.snapValue("translate", nextPos.x);
        nextPos.y = this._gizmo.snapValue("translate", nextPos.y);
        nextPos.z = this._gizmo.snapValue("translate", nextPos.z);
      }
      return { obj, pos: nextPos };
    });

    this._undo.execute({
      label: `Move ${objs.length} object${objs.length > 1 ? "s" : ""}`,
      redo: () => {
        for (const { obj, pos } of after) {
          obj.position.copyFrom(pos);
          obj.updateMatrixWorld();
        }
        this._updateGizmo();
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        for (const { obj, pos } of before) {
          obj.position.copyFrom(pos);
          obj.updateMatrixWorld();
        }
        this._updateGizmo();
        this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
        this._project.scheduleAutosave(() => this.scene.root);
      },
    });
  }
}
