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
  Color,
} from "../../core/index.js";
import { Grid, Cube } from "../../geometry/index.js";
import { Raycaster, BoundingBox, BoundingSphere } from "../../physix/index.js";
import { BoundingType, CameraStrategyType } from "../../enums/index.js";
import { EngineOptions } from "../../interfaces/index.js";
import { Vector2D, Vector3D } from "../../math/index.js";

import { OrbitCameraController } from "./OrbitCameraController.js";
import { UndoStack } from "./UndoStack.js";
import { HierarchyPanel } from "./HierarchyPanel.js";
import { PropertyPanel } from "./PropertyPanel.js";
import { ObjectPalette } from "./ObjectPalette.js";
import { ProjectBinding } from "./ProjectBinding.js";

export interface MakerAppOptions extends EngineOptions {
  hierarchyContainer: HTMLElement;
  propertyContainer: HTMLElement;
  paletteContainer: HTMLElement;
  statusContainer: HTMLElement;
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

  private _selected: Object3D | undefined;
  private _highlightMesh!: Object3D;
  private _hierarchyPanel!: HierarchyPanel;
  private _propertyPanel!: PropertyPanel;
  private _hierarchyDirty = true;

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

    this._highlightMesh = new Object3D("MakerHighlight");
    this._highlightMesh.geometry = new Cube({ size: 1 }).getGeometryData();
    this._highlightMesh.material = new WireframeMaterial(new Color(0, 1, 1));
    this._highlightMesh.isVisible = false;
    this.scene.add(this._highlightMesh);

    this.camera.setStrategy(CameraStrategyType.MANUAL);
    this.camera.position.set(8, 6, 8);
    this._orbit.target.set(0, 0, 0);

    this._propertyPanel = new PropertyPanel(this._makerOptions.propertyContainer, this._undo);
    this._hierarchyPanel = new HierarchyPanel(
      this._makerOptions.hierarchyContainer,
      () => this.scene.root,
      {
        onSelect: (obj): void => this.selectObject(obj),
        onReparent: (obj, newParent): void => this.reparent(obj, newParent),
      },
    );
    new ObjectPalette(this._makerOptions.paletteContainer, {
      createObject: (factory): void => this.addObject(factory()),
      attachBehavior: (factory): void => this.attachBehaviorToSelection(factory()),
    });

    this._project.onDirtyChange((dirty) => {
      this._makerOptions.statusContainer.textContent = dirty ? "Unsaved changes…" : "Saved";
    });
    this._setupProjectToolbar();

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
        this._makerOptions.statusContainer.textContent = "Saved";
      })();
    });
    this._makerOptions.paletteContainer.prepend(button);
  }

  protected override update(deltaTime: number): void {
    this._orbit.update(this.camera, this.input);
    if (this._hierarchyDirty) {
      this._hierarchyPanel.refresh();
      this._hierarchyDirty = false;
    }
    if (this._selected) this._syncHighlight();
    this.scene.update(deltaTime);
  }

  public selectObject(obj: Object3D | undefined): void {
    this._selected = obj;
    this._propertyPanel.setSelection(obj);
    this._hierarchyPanel.setSelected(obj);
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

  public deleteObject(obj: Object3D): void {
    const parent = obj.parent;
    if (!parent) return;
    this._undo.execute({
      label: `Delete ${obj.name}`,
      redo: () => {
        this._trashBin.add(obj);
        this._hierarchyDirty = true;
        if (this._selected === obj) this.selectObject(undefined);
        this._project.scheduleAutosave(() => this.scene.root);
      },
      undo: () => {
        parent.add(obj);
        this._hierarchyDirty = true;
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
    this._raycaster.setFromCamera(ndc, this.camera);

    const pickable: Object3D[] = [];
    this._collectPickable(this.scene.root, pickable);
    const hits = this._raycaster.intersectObjects(pickable, true);
    this.selectObject(0 < hits.length ? hits[0]!.object : undefined);
  }

  /** Mirrors `GadgetInspector`'s own picking scope (visible objects only, own helper meshes
   * excluded) so Maker and the still-live GadgetInspector behave consistently while both exist. */
  private _collectPickable(parent: Object3D, out: Object3D[]): void {
    if (parent === this._highlightMesh) return;
    if (parent.isVisible) {
      if (parent.geometry) parent.computeBounds();
      out.push(parent);
    }
    for (const child of parent.children) this._collectPickable(child, out);
  }

  private _syncHighlight(): void {
    const obj = this._selected;
    if (!obj) {
      this._highlightMesh.isVisible = false;
      return;
    }
    if (obj.geometry) obj.computeBounds();
    if (!obj.bounds) {
      this._highlightMesh.isVisible = false;
      return;
    }

    const epsilon = new Vector3D(0.02, 0.02, 0.02);
    if (BoundingType.BOX === obj.bounds.type) {
      const box = obj.bounds as BoundingBox;
      const size = new Vector3D().copyFrom(box.max).sub(box.min).add(epsilon);
      this._highlightMesh.position.copyFrom(box.center);
      this._highlightMesh.scale.copyFrom(size);
      this._highlightMesh.updateMatrixWorld();
      this._highlightMesh.isVisible = true;
    } else if (BoundingType.SPHERE === obj.bounds.type) {
      const sphere = obj.bounds as BoundingSphere;
      const diameter = sphere.radius * 2;
      const size = new Vector3D(diameter, diameter, diameter).add(epsilon);
      this._highlightMesh.position.copyFrom(sphere.center);
      this._highlightMesh.scale.copyFrom(size);
      this._highlightMesh.updateMatrixWorld();
      this._highlightMesh.isVisible = true;
    } else {
      this._highlightMesh.isVisible = false;
    }
  }

  private _onMakerKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && "z" === event.key.toLowerCase()) {
      event.preventDefault();
      if (event.shiftKey) this._undo.redo();
      else this._undo.undo();
      this._propertyPanel.setSelection(this._selected);
      this._hierarchyDirty = true;
      return;
    }
    if ("Delete" === event.key || "Backspace" === event.key) {
      const active = document.activeElement;
      // Don't hijack Backspace while the user is typing into a text field.
      if (active && ("INPUT" === active.tagName || "TEXTAREA" === active.tagName)) return;
      if (this._selected) {
        event.preventDefault();
        this.deleteObject(this._selected);
      }
    }
  }
}
