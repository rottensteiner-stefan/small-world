import { Pane, FolderApi } from "tweakpane";
import { Scene } from "../core/Scene.js";
import { CameraInterfaceData } from "../interfaces/index.js";
import { Object3D } from "../core/Object3D.js";
import { Raycaster } from "../physix/index.js";
import { Vector2D, Vector3D } from "../math/index.js";
import { BoundingBox } from "../physix/index.js";
import { Cube } from "../geometry/Cube.js";
import { WireframeMaterial } from "../core/index.js";
import { Color } from "../core/colors/index.js";
import { BoundingType } from "../enums/index.js";

/**
 * A lightweight editor/inspector overlay for small-world.
 * Uses Raycasting for object picking and Tweakpane for property editing.
 */
export class GadgetInspector {
  private _pane: Pane;
  private _raycaster: Raycaster = new Raycaster();
  private _mouse: Vector2D = new Vector2D();
  private _selectedObject: Object3D | null = null;
  private _highlightMesh: Object3D;
  private _folder: FolderApi | null = null;

  /**
   * Creates a new Gadget Inspector overlay.
   * @param _scene The scene to inspect.
   * @param _camera The camera used to raycast.
   * @param _canvas The canvas to attach picking events to.
   */
  constructor(
    private _scene: Scene,
    private _camera: CameraInterfaceData,
    private _canvas: HTMLCanvasElement,
  ) {
    // 1. Initialize Tweakpane
    this._pane = new Pane({ title: "Gadget Inspector" });

    // 2. Create Highlight Mesh (Neon Cyan Wireframe)
    const geo = new Cube({ size: 1 });
    const mat = new WireframeMaterial(new Color(0.0, 1.0, 1.0));
    this._highlightMesh = new Object3D("InspectorHighlight");
    this._highlightMesh.geometry = geo.getGeometryData();
    this._highlightMesh.material = mat;
    this._highlightMesh.isVisible = false;
    this._scene.add(this._highlightMesh);

    // 3. Setup Interaction
    this._canvas.addEventListener("pointerdown", (event: PointerEvent) => {
      // Nur picken, wenn SHIFT gedrückt ist (verhindert Konflikte mit PointerLock in Examples)
      if (!event.shiftKey) return;

      this._onPointerDown(event);
    });
  }

  private _getAllObjects(parent: Object3D, list: Object3D[] = []): Object3D[] {
    if (parent.isVisible && parent !== this._highlightMesh) {
      if (parent.geometry) {
        parent.computeBounds();
      }
      list.push(parent);
      for (const child of parent.children) {
        this._getAllObjects(child, list);
      }
    }
    return list;
  }

  private _onPointerDown(event: PointerEvent): void {
    // Only pick on left click
    if (0 !== event.button) {
      return;
    }

    const rect = this._canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to NDC (-1 to +1)
    this._mouse.x = (x / rect.width) * 2 - 1;
    this._mouse.y = -(y / rect.height) * 2 + 1;

    // Raycast
    this._raycaster.setFromCamera(this._mouse, this._camera);

    // Get all pickable objects
    const pickableObjects: Object3D[] = [];
    for (const child of this._scene.objects) {
      this._getAllObjects(child, pickableObjects);
    }

    const intersects = this._raycaster.intersectObjects(pickableObjects, true);

    if (0 < intersects.length) {
      const hit = intersects[0]!;
      this.selectObject(hit.object);
    } else {
      this.deselect();
    }
  }

  /**
   * Selects an object and updates the GUI.
   * @param obj The object to select.
   */
  public selectObject(obj: Object3D): void {
    if (this._selectedObject === obj) {
      return;
    }

    this._selectedObject = obj;

    if (obj.geometry) {
      obj.computeBounds();
    }
    if (obj.bounds && BoundingType.BOX === obj.bounds.type) {
      const box = obj.bounds as BoundingBox;
      const size = new Vector3D().copyFrom(box.max).sub(box.min);
      // Small epsilon to prevent z-fighting with the object's actual mesh
      size.add(new Vector3D(0.02, 0.02, 0.02));

      this._highlightMesh.position.copyFrom(box.center);
      this._highlightMesh.scale.copyFrom(size);
      this._highlightMesh.updateMatrixWorld(true);
      this._highlightMesh.isVisible = true;
    } else {
      this._highlightMesh.isVisible = false;
    }

    this._buildGUI(obj);
  }

  /**
   * Deselects the current object.
   */
  public deselect(): void {
    this._selectedObject = null;
    this._highlightMesh.isVisible = false;
    if (this._folder) {
      this._folder.dispose();
      this._folder = null;
    }
  }

  /**
   * Rebuilds the Tweakpane UI for the selected object.
   * @param obj The newly selected object.
   */
  private _buildGUI(obj: Object3D): void {
    if (this._folder) {
      this._folder.dispose();
    }

    this._folder = this._pane.addFolder({ title: `Object: ${obj.constructor.name}` });

    if (obj.name && "" !== obj.name) {
      this._folder.addBinding(obj, "name", { readonly: true, label: "Name" });
    }

    const settingsFolder = this._folder.addFolder({ title: "General Settings" });
    settingsFolder.addBinding(obj, "isVisible", { label: "Visible" });
    settingsFolder.addBinding(obj, "castShadow", { label: "Cast Shadow" });
    settingsFolder.addBinding(obj, "receiveShadow", { label: "Recv Shadow" });

    if (obj.parent || obj.children.length > 0) {
      const hierarchyFolder = this._folder.addFolder({ title: "Hierarchy", expanded: false });

      if (obj.parent) {
        hierarchyFolder
          .addButton({ title: `↑ Parent: ${obj.parent.name || obj.parent.constructor.name}` })
          .on("click", () => {
            this.selectObject(obj.parent!);
          });
      }

      if (obj.children.length > 0) {
        for (let i = 0; i < obj.children.length; i++) {
          const child = obj.children[i]!;
          hierarchyFolder
            .addButton({ title: `↳ Child: ${child.name || child.constructor.name}` })
            .on("click", () => {
              this.selectObject(child);
            });
        }
      }
    }

    // Transform
    const transformFolder = this._folder.addFolder({ title: "Transform" });
    transformFolder.addBinding(obj.position, "x", { label: "Pos X" });
    transformFolder.addBinding(obj.position, "y", { label: "Pos Y" });
    transformFolder.addBinding(obj.position, "z", { label: "Pos Z" });

    transformFolder.addBinding(obj.rotation, "x", { label: "Rot X" });
    transformFolder.addBinding(obj.rotation, "y", { label: "Rot Y" });
    transformFolder.addBinding(obj.rotation, "z", { label: "Rot Z" });

    transformFolder.addBinding(obj.scale, "x", { label: "Scale X" });
    transformFolder.addBinding(obj.scale, "y", { label: "Scale Y" });
    transformFolder.addBinding(obj.scale, "z", { label: "Scale Z" });

    // Expose material type if available
    if (obj.material) {
      const matFolder = this._folder.addFolder({ title: "Material" });
      matFolder.addBinding(obj.material, "type", { readonly: true });

      const mat = obj.material as unknown as Record<string, unknown>;

      const bindColor = (propName: string, label: string): void => {
        if (propName in mat && mat[propName]) {
          const colorObj = mat[propName] as Color;
          if (typeof colorObj.r === "number") {
            const proxy = {
              color: { r: colorObj.r * 255, g: colorObj.g * 255, b: colorObj.b * 255 },
            };
            matFolder
              .addBinding(proxy, "color", { label })
              .on("change", (ev: { value: { r: number; g: number; b: number } }) => {
                colorObj.r = ev.value.r / 255;
                colorObj.g = ev.value.g / 255;
                colorObj.b = ev.value.b / 255;
              });
          }
        }
      };

      bindColor("color", "Color");
      bindColor("specularColor", "Specular");
      bindColor("emissiveColor", "Emissive");

      if ("shininess" in mat) matFolder.addBinding(mat, "shininess", { min: 0, max: 256 });
      if ("transparent" in mat) matFolder.addBinding(mat, "transparent");
      if ("alphaTest" in mat) matFolder.addBinding(mat, "alphaTest", { min: 0, max: 1 });
      if ("depthTest" in mat) matFolder.addBinding(mat, "depthTest");
      if ("depthWrite" in mat) matFolder.addBinding(mat, "depthWrite");
      if ("wireframe" in mat) matFolder.addBinding(mat, "wireframe");
      if ("opacity" in mat) matFolder.addBinding(mat, "opacity", { min: 0, max: 1 });
      if ("emissiveIntensity" in mat)
        matFolder.addBinding(mat, "emissiveIntensity", { min: 0, max: 10 });
      if ("metalness" in mat) matFolder.addBinding(mat, "metalness", { min: 0, max: 1 });
      if ("roughness" in mat) matFolder.addBinding(mat, "roughness", { min: 0, max: 1 });
    }

    // Lights
    const maybeLight = obj as unknown as Record<string, unknown>;
    if ("intensity" in maybeLight && "color" in maybeLight) {
      const lightCol = maybeLight.color as Color;
      if (typeof lightCol.r === "number") {
        const lightFolder = this._folder.addFolder({ title: "Light Properties" });

        const proxy = {
          color: { r: lightCol.r * 255, g: lightCol.g * 255, b: lightCol.b * 255 },
        };
        lightFolder
          .addBinding(proxy, "color", { label: "Color" })
          .on("change", (ev: { value: { r: number; g: number; b: number } }) => {
            lightCol.r = ev.value.r / 255;
            lightCol.g = ev.value.g / 255;
            lightCol.b = ev.value.b / 255;
          });

        lightFolder.addBinding(maybeLight, "intensity", { min: 0, max: 20, label: "Intensity" });

        if ("distance" in maybeLight) {
          lightFolder.addBinding(maybeLight, "distance", { min: 0, max: 100, label: "Distance" });
        }
        if ("decay" in maybeLight) {
          lightFolder.addBinding(maybeLight, "decay", { min: 0, max: 5, label: "Decay" });
        }
      }
    }
  }

  /**
   * Updates the inspector logic (should be called in the render loop).
   */
  public update(): void {
    if (this._selectedObject && this._highlightMesh.isVisible) {
      // Keep highlight mesh synced with the object's bounds
      const obj = this._selectedObject;
      if (obj.geometry) {
        obj.computeBounds();
      }
      if (obj.bounds && BoundingType.BOX === obj.bounds.type) {
        const box = obj.bounds as BoundingBox;
        const size = new Vector3D().copyFrom(box.max).sub(box.min);
        size.add(new Vector3D(0.02, 0.02, 0.02));
        this._highlightMesh.position.copyFrom(box.center);
        this._highlightMesh.scale.copyFrom(size);
        this._highlightMesh.updateMatrixWorld(true);
      }
    }
  }
}
