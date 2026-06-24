/// src/tools/GadgetInspector.ts
import { Pane, FolderApi } from "tweakpane";
import { Scene } from "../core/Scene.js";
import { CameraInterfaceData } from "../interfaces/index.js";
import { Object3D } from "../core/Object3D.js";
import { Behavior } from "../core/index.js";
import { Raycaster } from "../physix/index.js";
import { Vector2D, Vector3D } from "../math/index.js";
import { BoundingBox } from "../physix/index.js";
import { Cube } from "../geometry/Cube.js";
import { WireframeMaterial } from "../core/index.js";
import { Color } from "../core/index.js";
import { BoundingType } from "../enums/index.js";
import { Input } from "../core/Input.js";
import { Renderer } from "../interfaces/Renderer.js";
import { FrustumCuller } from "../core/FrustumCuller.js";

interface BindingLike {
  refresh(): void;
}

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

  private _stats = {
    renderer: "None",
    resolution: "0x0",
    fps: 0,
    objects: 0,
    visible: 0,
  };

  private _resolutionBinding?: BindingLike;
  private _fpsBinding?: BindingLike;
  private _objectsBinding?: BindingLike;
  private _visibleBinding?: BindingLike;
  private _lastFpsUpdate: number = 0;
  private _frameCount: number = 0;

  /**
   * Creates a new Gadget Inspector overlay.
   * @param _scene The scene to inspect.
   * @param _camera The camera used to raycast.
   * @param _canvas The canvas to attach picking events to.
   * @param _renderer The active renderer instance.
   */
  constructor(
    private _scene: Scene,
    private _camera: CameraInterfaceData,
    private _canvas: HTMLCanvasElement,
    private _renderer?: Renderer,
  ) {
    // 1. Initialize Tweakpane (hidden by default)
    this._pane = new Pane({ title: "Gadget Inspector" });
    this._pane.element.style.display = "none";
    this._pane.element.style.setProperty("z-index", "999999", "important");
    this._pane.element.style.maxHeight = "90vh";
    this._pane.element.style.overflowY = "auto";
    this._pane.element.style.overflowX = "hidden";

    // Setup Diagnostics folder
    if (undefined !== this._renderer) {
      this._stats.renderer = this._renderer.constructor.name;
    }
    const diagFolder = (
      this._pane as unknown as {
        addFolder: (params: { title: string; expanded?: boolean }) => FolderApi;
      }
    ).addFolder({ title: "Diagnostics", expanded: true });

    diagFolder.addBinding(this._stats, "renderer", { readonly: true, label: "Renderer" });
    this._resolutionBinding = diagFolder.addBinding(this._stats, "resolution", {
      readonly: true,
      label: "Resolution",
    });
    this._fpsBinding = diagFolder.addBinding(this._stats, "fps", { readonly: true, label: "FPS" });
    this._objectsBinding = diagFolder.addBinding(this._stats, "objects", {
      readonly: true,
      label: "Total Objects",
    });
    this._visibleBinding = diagFolder.addBinding(this._stats, "visible", {
      readonly: true,
      label: "Visible Objects",
    });

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
      // Pick directly if the inspector is visible
      if ("none" === this._pane.element.style.display) {
        return;
      }

      this._onPointerDown(event);
    });

    // 4. Global key listener for toggling the inspector via Option(left) + Command(left) + G
    window.addEventListener("keydown", (event: KeyboardEvent) => {
      // Suppress toggling if currently typing in an input field or textarea
      if (
        document.activeElement &&
        ("INPUT" === document.activeElement.tagName ||
          "TEXTAREA" === document.activeElement.tagName)
      ) {
        return;
      }

      // Ignore key holding repeats
      if (true === event.repeat) {
        return;
      }

      // Check if KeyG is pressed (using physical code to ignore modifier character shifts)
      if ("KeyG" === event.code) {
        // Option(left) + Command(left) [macOS] OR Option(left) + Control(left) [Windows/Linux fallback]
        const altLeft = Input.instance.isPressed("AltLeft") || event.altKey;
        const metaLeft = Input.instance.isPressed("MetaLeft") || event.metaKey;
        const ctrlLeft = Input.instance.isPressed("ControlLeft") || event.ctrlKey;

        if (true === altLeft && (true === metaLeft || true === ctrlLeft)) {
          event.preventDefault();

          const isHidden = "none" === this._pane.element.style.display;

          if (isHidden) {
            // Inspector opened: block pointer lock and exit active pointer lock
            this._pane.element.style.display = "";
            Input.preventPointerLock = true;
            if (null !== document.pointerLockElement) {
              document.exitPointerLock();
            }
          } else {
            // Inspector closed: unblock pointer lock and deselect
            this._pane.element.style.display = "none";
            Input.preventPointerLock = false;
            this.deselect();
          }
        }
      }
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

    // Workaround for Tweakpane Pane type definitions missing addFolder in older versions
    this._folder = (
      this._pane as unknown as { addFolder: (params: { title: string }) => FolderApi }
    ).addFolder({ title: `Object: ${obj.constructor.name}` });

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
      const lightCol = maybeLight["color"] as Color;
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

    // Behaviors
    if (obj.behaviors && obj.behaviors.length > 0) {
      const behaviorsFolder = this._folder.addFolder({ title: "Behaviors", expanded: true });
      for (const behavior of obj.behaviors) {
        const behaviorClass = behavior.constructor as typeof Behavior & {
          inspector?: Record<
            string,
            {
              type: "number" | "boolean" | "string" | "choice";
              label?: string;
              min?: number;
              max?: number;
              step?: number;
              options?: string[] | Record<string, string | number>;
              path?: string;
            }
          >;
        };

        const behaviorFolder = behaviorsFolder.addFolder({
          title: behaviorClass.name,
          expanded: true,
        });

        // Add Active status
        behaviorFolder.addBinding(behavior, "isActive", { label: "Active" });

        // Add custom inspector bindings if defined
        if (behaviorClass.inspector) {
          for (const [key, config] of Object.entries(behaviorClass.inspector)) {
            // Determine target object and target key
            let targetObj: Record<string, unknown> = behavior as unknown as Record<string, unknown>;
            let targetKey: string = key;
            if (config.path) {
              const parts = config.path.split(".");
              for (let i = 0; i < parts.length - 1; i++) {
                if (targetObj) {
                  targetObj = targetObj[parts[i]!] as Record<string, unknown>;
                }
              }
              targetKey = parts[parts.length - 1]!;
            }

            if (targetObj && targetKey in targetObj) {
              const options: Record<string, unknown> = {
                label: config.label || key,
              };

              if (config.type === "number") {
                if (typeof config.min === "number") options["min"] = config.min;
                if (typeof config.max === "number") options["max"] = config.max;
                if (typeof config.step === "number") options["step"] = config.step;
              } else if (config.type === "choice") {
                if (config.options) {
                  if (Array.isArray(config.options)) {
                    const optObj: Record<string, unknown> = {};
                    for (const opt of config.options) {
                      optObj[opt] = opt;
                    }
                    options["options"] = optObj;
                  } else {
                    options["options"] = config.options;
                  }
                }
              }

              behaviorFolder.addBinding(targetObj, targetKey, options);
            }
          }
        }
      }
    }
  }

  /**
   * Updates the inspector logic (should be called in the render loop).
   */
  public update(): void {
    const isHidden = "none" === this._pane.element.style.display;
    if (true === isHidden) {
      this._lastFpsUpdate = performance.now();
      this._frameCount = 0;
      return;
    }

    // 1. Calculate FPS
    const now = performance.now();
    this._frameCount++;
    if (1000 <= now - this._lastFpsUpdate) {
      this._stats.fps = Math.round((this._frameCount * 1000) / (now - this._lastFpsUpdate));
      this._frameCount = 0;
      this._lastFpsUpdate = now;
      if (undefined !== this._fpsBinding) {
        this._fpsBinding.refresh();
      }
    }

    // 2. Resolution
    const resString = `${this._canvas.width}x${this._canvas.height}`;
    if (this._stats.resolution !== resString) {
      this._stats.resolution = resString;
      if (undefined !== this._resolutionBinding) {
        this._resolutionBinding.refresh();
      }
    }

    // 3. Count total objects
    let totalObjects = 0;
    for (let i = 0; i < this._scene.objects.length; i++) {
      totalObjects += this._countSceneObjects(this._scene.objects[i]!);
    }
    this._stats.objects = totalObjects;
    if (undefined !== this._objectsBinding) {
      this._objectsBinding.refresh();
    }

    // 4. Visible objects from FrustumCuller
    this._stats.visible = FrustumCuller.lastVisibleCount;
    if (undefined !== this._visibleBinding) {
      this._visibleBinding.refresh();
    }

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

  private _countSceneObjects(obj: Object3D): number {
    let count = 1;
    for (let i = 0; i < obj.children.length; i++) {
      count += this._countSceneObjects(obj.children[i]!);
    }
    return count;
  }
}
