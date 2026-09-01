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
  AmbientLight,
  WireframeMaterial,
  StandardMaterial,
  Color,
} from "../../core/index.js";
import { Grid, Cube } from "../../geometry/index.js";
import { Raycaster, BoundingBox, BoundingSphere } from "../../physix/index.js";
import { BoundingType, CameraStrategyType } from "../../enums/index.js";
import { EngineOptions } from "../../interfaces/index.js";
import { Vector2D, Vector3D } from "../../math/index.js";

import { OrbitCameraController, OrbitCameraView } from "./OrbitCameraController.js";
import { UndoStack } from "./UndoStack.js";
import { HierarchyPanel } from "./HierarchyPanel.js";
import { PropertyPanel } from "./PropertyPanel.js";
import { ObjectPalette } from "./ObjectPalette.js";
import { PrefabPalette } from "./PrefabPalette.js";
import { ProjectBinding } from "./ProjectBinding.js";
import { TransformGizmo, GizmoMode, GizmoAxis } from "./TransformGizmo.js";
import { MapImportPanel } from "./MapImportPanel.js";
import { defaultAsciiMapLegend } from "./AsciiMapLegend.js";
import { GridLevelBuilder } from "../../extensions/grid-builder/index.js";

export interface MakerAppOptions extends EngineOptions {
  hierarchyContainer: HTMLElement;
  propertyContainer: HTMLElement;
  paletteContainer: HTMLElement;
  statusContainer: HTMLElement;
}

interface GizmoDragState {
  axis: GizmoAxis;
  mode: GizmoMode;
  /** Snapshot of the dragged vector (position/rotation/scale, whichever `mode` implies) for
   * every selected object at drag start -- the whole selection moves together, not just the
   * primary/pivot object the gizmo itself is anchored to. One before/after undo command is
   * pushed once the drag ends. */
  before: Map<Object3D, Vector3D>;
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
  /** In-memory only, per Maker session -- not part of the glTF world format, so it doesn't
   * survive a reload. A quality-of-life navigation aid, not scene content. */
  private readonly _cameraBookmarks = new Map<number, OrbitCameraView>();
  private _bookmarkButtons: Record<number, HTMLButtonElement> | undefined;

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

    this.camera.setStrategy(CameraStrategyType.MANUAL);
    this.camera.position.set(8, 6, 8);
    this._orbit.target.set(0, 0, 0);

    this._propertyPanel = new PropertyPanel(this._makerOptions.propertyContainer, this._undo);
    this._hierarchyPanel = new HierarchyPanel(
      this._makerOptions.hierarchyContainer,
      () => this.scene.root,
      {
        onSelect: (obj, toggle): void => {
          if (toggle) this.toggleSelect(obj);
          else this.selectObject(obj);
        },
        onReparent: (obj, newParent): void => this.reparent(obj, newParent),
      },
      (obj) => this._highlightMeshes.includes(obj) || obj === this._gizmo.root,
    );
    new ObjectPalette(this._makerOptions.paletteContainer, {
      createObject: (factory): void => this.addObject(factory()),
      attachBehavior: (factory): void => this.attachBehaviorToSelection(factory()),
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
    window.addEventListener("keydown", (e) => this._onMakerKeyDown(e));

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
        const thumbnail = await this._captureViewportThumbnail();
        if (thumbnail) await this._project.savePrefabThumbnail(name, thumbnail);
      }
      this._makerOptions.statusContainer.textContent = saved
        ? `Saved prefab "${name}"`
        : "Bind a project folder first to save prefabs";
      if (saved) await this._refreshPrefabList();
    })();
  }

  /** Captures a PNG snapshot of the current viewport for a prefab thumbnail -- hides the
   * translate/rotate/scale gizmo and the selection highlight box for one frame first (the two
   * things that would otherwise clutter every thumbnail, since a prefab is normally saved right
   * after selecting it), waits two `requestAnimationFrame`s (the first only guarantees our
   * visibility change is *scheduled*; the second is what actually runs after the browser has
   * painted a frame with it applied -- the standard "wait for the next real paint" pattern),
   * then restores both. Doesn't touch anything else in the scene, so unrelated objects still
   * visible in frame show up in the thumbnail too -- a from-scratch isolated render (reframing a
   * camera on just this object's bounds) is a further-out enhancement, not this pass's scope.
   *
   * Races that against a 1s timeout: a tab that loses visibility right after the click can pause
   * `requestAnimationFrame` indefinitely (real browser behavior, not just a test artifact), which
   * would otherwise hang every step after this one (the status text, the prefab list refresh)
   * forever, not just silently skip the thumbnail.
   * @returns undefined if the canvas can't be read, or the timeout wins, rather than throwing --
   * a missing thumbnail is cosmetic, not worth failing the whole "Save as Prefab" action over.
   */
  private _captureViewportThumbnail(): Promise<string | undefined> {
    const wasGizmoVisible = this._gizmo.root.isVisible;
    const wasHighlightVisible = this._highlightMeshes.map((mesh) => mesh.isVisible);
    this._gizmo.root.isVisible = false;
    for (const mesh of this._highlightMeshes) mesh.isVisible = false;

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
      this._gizmo.root.isVisible = wasGizmoVisible;
      this._highlightMeshes.forEach((mesh, i) => {
        mesh.isVisible = wasHighlightVisible[i]!;
      });
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
    this._makerOptions.paletteContainer.prepend(row);
    this._setGizmoMode("translate");
  }

  private _setGizmoMode(mode: GizmoMode): void {
    this._gizmo.setMode(mode);
    if (!this._gizmoButtons) return;
    for (const m of Object.keys(this._gizmoButtons) as GizmoMode[]) {
      this._gizmoButtons[m].classList.toggle("active", m === mode);
    }
  }

  protected override update(deltaTime: number): void {
    this._orbit.update(this.camera, this.input);
    if (this._hierarchyDirty) {
      this._hierarchyPanel.refresh();
      this._hierarchyDirty = false;
    }
    this._syncHighlight();
    this.scene.update(deltaTime);
    this._updateGizmo();
  }

  private _updateGizmo(): void {
    this._gizmo.update(this.camera);
    if (!this._gizmoDrag) return;

    const { axis, mode } = this._gizmoDrag;
    const delta = this._gizmo.computeAxisDelta(
      axis,
      this.input.mouse.dx,
      this.input.mouse.dy,
      this.camera,
    );
    for (const obj of this._selection) {
      const vec =
        "translate" === mode ? obj.position : "rotate" === mode ? obj.rotation : obj.scale;
      if ("scale" === mode) {
        vec[axis] = Math.max(0.01, vec[axis] + delta);
      } else {
        vec[axis] += delta;
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
    const after = new Map<Object3D, Vector3D>();
    let changed = false;
    for (const [obj, beforeVec] of before) {
      const vec = (
        "translate" === mode ? obj.position : "rotate" === mode ? obj.rotation : obj.scale
      ).clone();
      after.set(obj, vec);
      if (vec[axis] !== beforeVec[axis]) changed = true;
    }
    if (!changed) return; // click without drag -- nothing to undo

    const apply = (values: Map<Object3D, Vector3D>): void => {
      for (const [obj, vec] of values) {
        (mode === "translate" ? obj.position : mode === "rotate" ? obj.rotation : obj.scale)[axis] =
          vec[axis];
        obj.updateMatrixWorld();
      }
      this._propertyPanel.setSelection(this._primary, Math.max(0, this._selection.size - 1));
      this._project.scheduleAutosave(() => this.scene.root);
    };

    this._undo.execute({
      label: `Gizmo ${mode} ${axis.toUpperCase()}${before.size > 1 ? ` (${before.size})` : ""}`,
      redo: () => apply(after),
      undo: () => apply(before),
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

  public addObject(obj: Object3D): void {
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
    });
  }

  public attachBehaviorToSelection(behavior: Behavior): void {
    const obj = this._selected;
    if (!obj) return;
    this._undo.execute({
      label: `Attach ${behavior.constructor.name}`,
      redo: () => {
        attachBehavior(obj.behaviors, behavior, obj);
        this._propertyPanel.setSelection(obj);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        detachBehavior(obj.behaviors, behavior);
        this._propertyPanel.setSelection(obj);
        this._project.scheduleAutosave(() => this.scene.root);
      },
    });
  }

  private _onPointerDown(event: PointerEvent): void {
    if (0 !== event.button) return; // Left click only -- right-drag is the orbit camera.
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector2D(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const gizmoAxis = this._gizmo.pickAxis(ndc, this.camera);
    if (gizmoAxis && this._primary) {
      const mode = this._gizmo.mode;
      const before = new Map<Object3D, Vector3D>();
      for (const obj of this._selection) {
        const vec =
          "translate" === mode ? obj.position : "rotate" === mode ? obj.rotation : obj.scale;
        before.set(obj, vec.clone());
      }
      this._gizmoDrag = { axis: gizmoAxis, mode, before };
      return; // Gizmo handle grabbed -- don't also run normal object picking below.
    }

    this._raycaster.setFromCamera(ndc, this.camera);
    const pickable: Object3D[] = [];
    this._collectPickable(this.scene.root, pickable);
    const hits = this._raycaster.intersectObjects(pickable, true);
    const hitObj = 0 < hits.length ? hits[0]!.object : undefined;

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      // Modifier + empty space is intentionally a no-op -- it shouldn't clear an existing
      // multi-selection, unlike a plain click on empty space.
      if (hitObj) this.toggleSelect(hitObj);
    } else {
      this.selectObject(hitObj);
    }
  }

  /** Mirrors `GadgetInspector`'s own picking scope (visible objects only, own helper meshes
   * excluded) so Maker and the still-live GadgetInspector behave consistently while both exist. */
  private _collectPickable(parent: Object3D, out: Object3D[]): void {
    // `isVisible` below is per-node, not cumulative through the parent chain -- the gizmo's own
    // leaf handles stay `isVisible = true` even while their containing mode-group (or the whole
    // gizmo root) is hidden, so it must be excluded by identity here, the same way as the
    // highlight mesh, rather than relying on visibility alone.
    if (this._highlightMeshes.includes(parent) || parent === this._gizmo.root) return;
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

    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && ("d" === key || "g" === key)) {
      const active = document.activeElement;
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (0 === this._selection.size) return;
      event.preventDefault();
      if ("d" === key) this.duplicateSelection();
      else this.groupSelection();
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
    }
  }
}
