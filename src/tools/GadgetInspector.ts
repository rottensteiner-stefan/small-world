import { Pane, FolderApi, TabPageApi } from "tweakpane";
import * as CamerakitPlugin from "@kitschpatrol/tweakpane-plugin-camerakit";
import {
  Scene,
  Object3D,
  DeviceCaps,
  DeviceFeature,
  DeviceLimit,
  FrustumCuller,
  AxesHelper,
} from "../core/index.js";
import { BoundingType } from "../enums/index.js";
import { CameraInterfaceData, Renderer } from "../interfaces/index.js";
import { Behavior } from "../core/behaviors/index.js";
import { WireframeMaterial } from "../core/materials/index.js";
import { Color } from "../core/colors/index.js";
import { Raycaster, BoundingBox, BoundingSphere } from "../physix/index.js";
import { Cube } from "../geometry/index.js";
import { Vector2D, Vector3D, MathPool } from "../math/index.js";
import { ForgeTool, ForgeToolOptions } from "./forge/ForgeTool.js";
import { DisposableBlade, RefreshableBinding } from "./inspector/index.js";

/**
 * A lightweight editor/inspector overlay for small-world.
 * Uses Raycasting for object picking and Tweakpane for property editing.
 */
export class GadgetInspector extends ForgeTool {
  private _pane: Pane;
  private _raycaster = new Raycaster();
  private _mouse = new Vector2D();
  private _selectedObject: Object3D | null = null;
  private _highlightMesh: Object3D;
  private _worldAxes: AxesHelper;
  private _objectAxes: AxesHelper;
  private _axesSettings = {
    showWorldAxes: false,
    showObjectAxes: false,
    axesScale: 1.0,
  };
  private _sceneTab!: TabPageApi;
  private _selectedFolder!: FolderApi;
  private _selectedBlades: DisposableBlade[] = [];

  private _stats = {
    renderer: "None",
    resolution: "0x0",
    fps: 0,
    objects: 0,
    visible: 0,
  };

  private _resolutionBinding: RefreshableBinding | undefined;
  private _fpsBinding: RefreshableBinding | undefined;
  private _objectsBinding: RefreshableBinding | undefined;
  private _visibleBinding: RefreshableBinding | undefined;
  private _lastFpsUpdate: number = 0;
  private _frameCount: number = 0;

  private _overviewFolder!: FolderApi;
  private _overviewBlades: DisposableBlade[] = [];
  private _lastOverviewRefresh: number = 0;
  /** How often the scene overview re-scans the tree, in ms -- a full tree walk on every
   * frame would be wasteful, especially in scenes with thousands of objects. */
  private static readonly _OVERVIEW_REFRESH_INTERVAL_MS = 1500;
  /** Hard cap on distinct "kinds" shown -- grouping already collapses e.g. 1000 identical
   * particles into one row, but this is the backstop for scenes with many DIFFERENT
   * one-off object names. */
  private static readonly _OVERVIEW_MAX_GROUPS = 40;

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
    options: ForgeToolOptions = {},
  ) {
    super(options);

    // 1. Initialize Tweakpane
    this._pane = new Pane({ container: this._container });
    this._pane.registerPlugin(CamerakitPlugin);

    // We don't need absolute positioning anymore since ForgeWindow handles it
    this._pane.element.style.width = "100%";

    // Create Tool-bar (Tabs)
    const tabs = this._pane.addTab({
      pages: [
        { title: "🌍" }, // Scene
        { title: "🔍" }, // Search
        { title: "📈" }, // Stats & Diag
        { title: "⚙️" }, // Renderer
        { title: "🔊" }, // Audio
      ],
    });

    this._sceneTab = tabs.pages[0]!;
    const searchTab = tabs.pages[1]!;
    const statsTab = tabs.pages[2]!;
    const renderTab = tabs.pages[3]!;
    const audioTab = tabs.pages[4]!;

    // 1. Permanent Selected Object Folder at the TOP of Scene Tab
    this._selectedFolder = this._sceneTab.addFolder({
      title: "🎯 No Object Selected",
      expanded: true,
    });

    // 2. Helpers & Gizmos folder
    const helpersFolder = this._sceneTab.addFolder({
      title: "📐 Helpers & Gizmos",
      expanded: false,
    });
    helpersFolder
      .addBinding(this._axesSettings, "showWorldAxes", { label: "World Axes" })
      .on("change", (ev: { value: boolean }) => {
        this._worldAxes.isVisible = ev.value;
      });
    helpersFolder
      .addBinding(this._axesSettings, "showObjectAxes", { label: "Object Axes" })
      .on("change", (ev: { value: boolean }) => {
        this._objectAxes.isVisible = ev.value && null !== this._selectedObject;
      });
    helpersFolder
      .addBinding(this._axesSettings, "axesScale", {
        label: "Axes Scale",
        min: 0.1,
        max: 5.0,
        step: 0.1,
      })
      .on("change", (ev: { value: number }) => {
        this._worldAxes.scale.set(ev.value, ev.value, ev.value);
        this._objectAxes.scale.set(ev.value, ev.value, ev.value);
      });

    // 3. Scene overview: collapsible outliner
    this._overviewFolder = this._sceneTab.addFolder({
      title: "📚 Scene Outliner",
      expanded: false,
    });
    this._refreshOverview();

    // Add Search Object feature
    const searchParams = { name: "" };
    const searchResultBlades: { dispose: () => void }[] = [];

    const binding = searchTab.addBinding(searchParams, "name", { label: "🔍" });

    // Use DOM events to get immediate input feedback instead of waiting for change/blur.
    // `element` is BladeApi's public, documented root-DOM-node getter — unlike reaching into
    // `controller.view.valueElement` (Tweakpane internals not covered by its public API).
    const inputEl = binding.element.querySelector("input");
    if (inputEl) {
      inputEl.addEventListener("input", (e: Event) => {
        const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
        searchParams.name = query;

        for (const blade of searchResultBlades) {
          blade.dispose();
        }
        searchResultBlades.length = 0;

        if (query.length < 3) return;

        const allObjects: Object3D[] = [];
        for (const child of this._scene.objects) {
          this._getAllObjects(child, allObjects, true);
        }

        const matches = allObjects.filter(
          (obj: Object3D) => obj.name && obj.name.toLowerCase().includes(query),
        );

        const limit = Math.min(matches.length, 10);
        for (let i = 0; i < limit; i++) {
          const match = matches[i]!;
          const btn = searchTab.addButton({ title: `↳ ${match.name}` });
          btn.on("click", () => {
            this.selectObject(match);
            this._sceneTab.selected = true;
          });
          searchResultBlades.push(btn);
        }

        if (matches.length > limit) {
          const btn = searchTab.addButton({ title: `... and ${matches.length - limit} more` });
          searchResultBlades.push(btn);
        }
      });
    }

    // Setup Diagnostics folder
    if (undefined !== this._renderer) {
      this._stats.renderer = this._renderer.constructor.name;
    }
    const diagFolder = statsTab.addFolder({ title: "Diagnostics", expanded: true });

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

    if (this._renderer && this._renderer.quality) {
      const renderFolder = renderTab.addFolder({ title: "Renderer Settings", expanded: true });

      renderFolder.addBinding(this._renderer.quality, "disableTextures", {
        label: "Disable Textures",
      });
    }

    const capsFolder = statsTab.addFolder({ title: "Capabilities", expanded: false });

    const caps = {
      WebGL1: DeviceCaps.hasFeature(DeviceFeature.WEBGL1) ? "Yes" : "No",
      WebGL2: DeviceCaps.hasFeature(DeviceFeature.WEBGL2) ? "Yes" : "No",
      WebGPU: DeviceCaps.hasFeature(DeviceFeature.WEBGPU) ? "Yes" : "No",
      TexSize: DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_SIZE),
      TexUnits: DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS),
      Anisotropy: DeviceCaps.getLimit(DeviceLimit.MAX_ANISOTROPY),
      UBOSize: DeviceCaps.getLimit(DeviceLimit.MAX_UNIFORM_BUFFER_SIZE),
      MSAA: DeviceCaps.getLimit(DeviceLimit.MAX_MSAA_SAMPLES),
      VertAttrs: DeviceCaps.getLimit(DeviceLimit.MAX_VERTEX_ATTRIBUTES),
      VertUnis: DeviceCaps.getLimit(DeviceLimit.MAX_VERTEX_UNIFORM_VECTORS),
      FragUnis: DeviceCaps.getLimit(DeviceLimit.MAX_FRAGMENT_UNIFORM_VECTORS),
      FloatTex: DeviceCaps.hasFeature(DeviceFeature.FLOAT_TEXTURES) ? "Yes" : "No",
      CompTex: DeviceCaps.hasFeature(DeviceFeature.COMPRESSED_TEXTURES) ? "Yes" : "No",
    };

    capsFolder.addBinding(caps, "WebGL1", { readonly: true, label: "WebGL1" });
    capsFolder.addBinding(caps, "WebGL2", { readonly: true, label: "WebGL2" });
    capsFolder.addBinding(caps, "WebGPU", { readonly: true, label: "WebGPU" });
    capsFolder.addBinding(caps, "TexSize", { readonly: true, label: "Max Tex Size" });
    capsFolder.addBinding(caps, "TexUnits", { readonly: true, label: "Max Tex Units" });
    capsFolder.addBinding(caps, "Anisotropy", { readonly: true, label: "Max Anisotropy" });
    capsFolder.addBinding(caps, "UBOSize", { readonly: true, label: "Max UBO Size" });
    capsFolder.addBinding(caps, "MSAA", { readonly: true, label: "Max MSAA" });
    capsFolder.addBinding(caps, "VertAttrs", { readonly: true, label: "Max Vert Attrs" });
    capsFolder.addBinding(caps, "VertUnis", { readonly: true, label: "Max Vert Unis" });
    capsFolder.addBinding(caps, "FragUnis", { readonly: true, label: "Max Frag Unis" });
    capsFolder.addBinding(caps, "FloatTex", { readonly: true, label: "Float Tex" });
    capsFolder.addBinding(caps, "CompTex", { readonly: true, label: "Compressed Tex" });

    const audioFolder = audioTab.addFolder({ title: "Audio Mixer", expanded: true });

    // Inject CSS for horizontal row layout
    if (!document.getElementById("tp-custom-styles")) {
      const style = document.createElement("style");
      style.id = "tp-custom-styles";
      style.innerHTML = `
        .audio-mixer-row .tp-fldv_c {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: space-around;
          padding: 12px 4px;
        }
        .audio-mixer-row .tp-fldv_c > .tp-brkv {
          flex: 1 1 25%;
          margin-right: 8px;
          margin-bottom: 8px;
        }
        .audio-mixer-row .tp-fldv_c > .tp-brkv:nth-child(3n) {
          margin-right: 8px; /* keep uniform spacing */
        }
        .audio-mixer-row .tp-fldv_c > .tp-brkv:last-child {
          margin-right: 0;
        }
        .audio-mixer-row .tp-lblv {
          flex-direction: column;
          align-items: center;
        }
        .audio-mixer-row .tp-lblv_l {
          padding-right: 0;
          text-align: center;
          width: 100%;
          margin-bottom: 8px;
          opacity: 0.8;
        }
        .audio-mixer-row .tp-lblv_v {
          width: 100%;
          display: flex;
          justify-content: center;
        }
      `;
      document.head.appendChild(style);
    }

    audioFolder.element.classList.add("audio-mixer-row");

    const audioSettings = {
      master: 1.0,
      music: 1.0,
      sfx: 1.0,
      reverb: 0.3,
    };

    // Use view: "cameraring" to create rotary knobs
    audioFolder
      .addBinding(audioSettings, "master", {
        label: "Master",
        min: 0,
        max: 1,
        step: 0.01,
        view: "cameraring",
      })
      .on("change", (ev: { value: number }) => {
        // In a real app we'd dispatch an event. Let's dispatch it.
        window.dispatchEvent(new CustomEvent("gadget:audio:master", { detail: ev.value }));
      });
    audioFolder
      .addBinding(audioSettings, "music", {
        label: "Music",
        min: 0,
        max: 1,
        step: 0.01,
        view: "cameraring",
      })
      .on("change", (ev: { value: number }) => {
        window.dispatchEvent(new CustomEvent("gadget:audio:music", { detail: ev.value }));
      });
    audioFolder
      .addBinding(audioSettings, "sfx", {
        label: "SFX",
        min: 0,
        max: 1,
        step: 0.01,
        view: "cameraring",
      })
      .on("change", (ev: { value: number }) => {
        window.dispatchEvent(new CustomEvent("gadget:audio:sfx", { detail: ev.value }));
      });
    audioFolder
      .addBinding(audioSettings, "reverb", {
        label: "Reverb",
        min: 0,
        max: 1,
        step: 0.01,
        view: "cameraring",
      })
      .on("change", (ev: { value: number }) => {
        window.dispatchEvent(new CustomEvent("gadget:audio:reverb", { detail: ev.value }));
      });

    // 2. Create Highlight Mesh (Neon Cyan Wireframe)
    const geo = new Cube({ size: 1 });
    const mat = new WireframeMaterial(new Color(0.0, 1.0, 1.0));
    this._highlightMesh = new Object3D("InspectorHighlight");
    this._highlightMesh.geometry = geo.getGeometryData();
    this._highlightMesh.material = mat;
    this._highlightMesh.isVisible = false;
    this._scene.add(this._highlightMesh);

    // 2.1 Create Coordinate Axes Helpers (Neon X-Red, Y-Green, Z-Blue)
    this._worldAxes = new AxesHelper({ size: 2.0 });
    this._worldAxes.name = "InspectorWorldAxes";
    this._worldAxes.isVisible = false;
    this._scene.add(this._worldAxes);

    this._objectAxes = new AxesHelper({ size: 1.0 });
    this._objectAxes.name = "InspectorObjectAxes";
    this._objectAxes.isVisible = false;
    this._scene.add(this._objectAxes);

    // 3. Setup Interaction
    this._canvas.addEventListener("pointerdown", (event: PointerEvent) => {
      // Pick directly if the inspector is visible
      if (!this.isInspectorOpen()) {
        return;
      }

      this._onPointerDown(event);
    });

    this._canvas.addEventListener("dblclick", (event: MouseEvent) => {
      if (!this.isInspectorOpen()) {
        return;
      }

      this._onDoubleClick(event);
    });
  }

  /**
   * Walks the scene graph collecting objects.
   * @param parent The node to start from.
   * @param list Accumulator (also the return value).
   * @param includeHidden When false (the default, used for 3D click-picking -- there's
   * nothing to click on if it isn't drawn), objects with `isVisible === false` are
   * skipped. When true (used by Search and the Objects overview), hidden objects are
   * still listed -- otherwise there'd be no way to find and re-show something you just
   * hid. Either way, traversal always continues into children: a hidden object's
   * children aren't necessarily hidden themselves.
   */
  private _getAllObjects(
    parent: Object3D,
    list: Object3D[] = [],
    includeHidden: boolean = false,
  ): Object3D[] {
    if (
      parent === this._highlightMesh ||
      parent === this._worldAxes ||
      parent === this._objectAxes
    ) {
      return list;
    }

    if (includeHidden || parent.isVisible) {
      if (parent.geometry) {
        parent.computeBounds();
      }
      list.push(parent);
    }
    for (const child of parent.children) {
      this._getAllObjects(child, list, includeHidden);
    }
    return list;
  }

  /**
   * Derives a group key for the scene overview by stripping a trailing separator+number
   * off an object's name (e.g. "Drone42" / "Disc_3" -> "Drone" / "Disc"), so repeated
   * instances of "the same kind of thing" collapse into one row. Falls back to the
   * object's class name for unnamed objects.
   */
  private _groupKeyFor(obj: Object3D): string {
    const base = obj.name && "" !== obj.name.trim() ? obj.name.trim() : obj.constructor.name;
    const stripped = base.replace(/[\s_-]?\d+$/, "");
    return "" !== stripped ? stripped : base;
  }

  /**
   * Rebuilds the "Objects" overview: one row per group, sorted largest-first, capped at
   * `_OVERVIEW_MAX_GROUPS` distinct kinds. Never lists individual members of a group --
   * that's what Search (for a known name) or clicking through Hierarchy is for.
   */
  private _refreshOverview(): void {
    for (const blade of this._overviewBlades) blade.dispose();
    this._overviewBlades.length = 0;

    const allObjects: Object3D[] = [];
    for (const child of this._scene.objects) {
      this._getAllObjects(child, allObjects, true);
    }

    const groups = new Map<string, Object3D[]>();
    for (const obj of allObjects) {
      const key = this._groupKeyFor(obj);
      let members = groups.get(key);
      if (!members) {
        members = [];
        groups.set(key, members);
      }
      members.push(obj);
    }

    const sortedGroups = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
    const shown = sortedGroups.slice(0, GadgetInspector._OVERVIEW_MAX_GROUPS);

    for (const [key, members] of shown) {
      const label = members.length > 1 ? `${key} (${members.length})` : key;
      const representative = members[0]!;
      const btn = this._overviewFolder.addButton({ title: label });
      btn.on("click", () => {
        this.selectObject(representative);
        this._sceneTab.selected = true;
      });
      this._overviewBlades.push(btn);
    }

    if (sortedGroups.length > shown.length) {
      const btn = this._overviewFolder.addButton({
        title: `... and ${sortedGroups.length - shown.length} more kinds`,
      });
      this._overviewBlades.push(btn);
    }
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

    console.log(
      `[GadgetInspector] PointerDown: CSS(x:${x}, y:${y}) -> NDC(x:${this._mouse.x}, y:${this._mouse.y})`,
    );

    // Raycast
    this._raycaster.setFromCamera(this._mouse, this._camera);

    // Get all pickable objects
    const pickableObjects: Object3D[] = [];
    for (const child of this._scene.objects) {
      this._getAllObjects(child, pickableObjects);
    }

    console.log(
      `[GadgetInspector] Raycasting against ${pickableObjects.length} pickable objects. Ray origin: ${this._raycaster.ray.origin.toString()}, dir: ${this._raycaster.ray.direction.toString()}`,
    );

    const intersects = this._raycaster.intersectObjects(pickableObjects, true);

    if (0 < intersects.length) {
      const hit = intersects[0]!;
      console.log(
        `[GadgetInspector] Hit object! Distance: ${hit.distance}, Name: ${hit.object.name}`,
      );
      this.selectObject(hit.object);
    } else {
      console.log(`[GadgetInspector] Ray hit nothing. Deselecting.`);
      this.deselect();
    }
  }

  private _onDoubleClick(event: MouseEvent): void {
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

    const pickableObjects: Object3D[] = [];
    for (const child of this._scene.objects) {
      this._getAllObjects(child, pickableObjects);
    }

    const intersects = this._raycaster.intersectObjects(pickableObjects, true);

    if (0 < intersects.length) {
      const hit = intersects[0]!;
      this.selectObject(hit.object);
      this._sceneTab.selected = true;
      this._selectedFolder.expanded = true;
      this._selectedFolder.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /**
   * Checks whether the GadgetInspector window/overlay is currently visible.
   */
  public isInspectorOpen(): boolean {
    if (typeof document === "undefined") return false;
    const overlay = this._container.closest(".swf-forge-overlay") as HTMLElement | null;
    if (overlay && "none" === overlay.style.display) {
      return false;
    }
    const win = this._container.closest(".swf-window") as HTMLElement | null;
    if (win && "none" === win.style.display) {
      return false;
    }
    return "none" !== this._pane.element.style.display;
  }

  /**
   * Selects an object and updates the GUI.
   * @param obj The object to select.
   */
  public selectObject(obj: Object3D): void {
    if (this._selectedObject === obj) {
      this._sceneTab.selected = true;
      this._selectedFolder.expanded = true;
      this._selectedFolder.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    this._selectedObject = obj;

    if (obj.geometry) {
      obj.computeBounds();
    }
    this._highlightMesh.isVisible = this._syncHighlightMesh(obj);
    this._objectAxes.isVisible = this._axesSettings.showObjectAxes;

    this._buildGUI(obj);
    this._sceneTab.selected = true;
    this._selectedFolder.expanded = true;
    this._selectedFolder.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * Positions/scales the cyan wireframe highlight cube to bound the given object,
   * whether its bounds are a box (used as-is) or a sphere (wrapped in a cube sized to
   * its diameter) -- there's deliberately only one highlight mesh shape, since "a box
   * around whatever's selected" is a perfectly normal selection indicator regardless of
   * the object's actual silhouette.
   * @returns Whether a highlight could be computed (false if the object has no bounds).
   */
  private _syncHighlightMesh(obj: Object3D): boolean {
    if (!obj.bounds) return false;

    // Small epsilon to prevent z-fighting with the object's actual mesh.
    const epsilon = new Vector3D(0.02, 0.02, 0.02);

    if (BoundingType.BOX === obj.bounds.type) {
      const box = obj.bounds as BoundingBox;
      const size = new Vector3D().copyFrom(box.max).sub(box.min).add(epsilon);
      this._highlightMesh.position.copyFrom(box.center);
      this._highlightMesh.scale.copyFrom(size);
      this._highlightMesh.updateMatrixWorld();
      return true;
    }

    if (BoundingType.SPHERE === obj.bounds.type) {
      const sphere = obj.bounds as BoundingSphere;
      const diameter = sphere.radius * 2;
      const size = new Vector3D(diameter, diameter, diameter).add(epsilon);
      this._highlightMesh.position.copyFrom(sphere.center);
      this._highlightMesh.scale.copyFrom(size);
      this._highlightMesh.updateMatrixWorld();
      return true;
    }

    return false;
  }

  /**
   * Deselects the current object.
   */
  public deselect(): void {
    this._selectedObject = null;
    this._highlightMesh.isVisible = false;
    this._objectAxes.isVisible = false;
    for (const blade of this._selectedBlades) {
      blade.dispose();
    }
    this._selectedBlades.length = 0;
    this._selectedFolder.title = "🎯 No Object Selected";
  }

  /**
   * Rebuilds the Tweakpane UI for the selected object within the top-level selection folder.
   * @param obj The newly selected object.
   */
  private _buildGUI(obj: Object3D): void {
    for (const blade of this._selectedBlades) {
      blade.dispose();
    }
    this._selectedBlades.length = 0;

    const displayName = obj.name && "" !== obj.name ? obj.name : obj.constructor.name;
    this._selectedFolder.title = `🎯 ${displayName}`;
    this._selectedFolder.expanded = true;

    if (obj.name && "" !== obj.name) {
      this._selectedBlades.push(
        this._selectedFolder.addBinding(obj, "name", { readonly: true, label: "Name" }),
      );
    }

    const settingsFolder = this._selectedFolder.addFolder({ title: "General Settings" });
    this._selectedBlades.push(settingsFolder);
    settingsFolder.addBinding(obj, "isVisible", { label: "Visible" });
    settingsFolder.addBinding(obj, "castShadow", { label: "Cast Shadow" });
    settingsFolder.addBinding(obj, "receiveShadow", { label: "Recv Shadow" });

    if (obj.parent || obj.children.length > 0) {
      const hierarchyFolder = this._selectedFolder.addFolder({
        title: "Hierarchy",
        expanded: false,
      });
      this._selectedBlades.push(hierarchyFolder);

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
    const transformFolder = this._selectedFolder.addFolder({ title: "Transform" });
    this._selectedBlades.push(transformFolder);
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
      const matFolder = this._selectedFolder.addFolder({ title: "Material" });
      this._selectedBlades.push(matFolder);
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
      if ("wireframeMode" in mat) {
        matFolder.addBinding(mat, "wireframeMode", {
          options: { structural: "structural", triangles: "triangles" },
        });
      }
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
        const lightFolder = this._selectedFolder.addFolder({ title: "Light Properties" });
        this._selectedBlades.push(lightFolder);

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

        const lightProps = {
          intensity: (maybeLight["intensity"] as number) || 0,
          distance: (maybeLight["distance"] as number) || 0,
          decay: (maybeLight["decay"] as number) || 0,
        };

        lightFolder
          .addBinding(lightProps, "intensity", {
            min: 0,
            max: 200,
            step: 0.01,
            label: "Intensity",
          })
          .on("change", (ev: { value: number }) => {
            maybeLight["intensity"] = ev.value;
          });

        if ("distance" in maybeLight) {
          lightFolder
            .addBinding(lightProps, "distance", { min: 0, max: 100, label: "Distance" })
            .on("change", (ev: { value: number }) => {
              maybeLight["distance"] = ev.value;
              // If it's a SpotLight or PointLight, it might need to update its shadow camera!
              const updateShadowCamera = maybeLight["updateShadowCamera"] as
                (() => void) | undefined;
              if (typeof updateShadowCamera === "function") {
                updateShadowCamera.call(maybeLight);
              }
            });
        }
        if ("decay" in maybeLight) {
          lightFolder
            .addBinding(lightProps, "decay", { min: 0, max: 5, label: "Decay" })
            .on("change", (ev: { value: number }) => {
              maybeLight["decay"] = ev.value;
            });
        }
      }
    }

    // Behaviors
    if (obj.behaviors && obj.behaviors.length > 0) {
      const behaviorsFolder = this._selectedFolder.addFolder({
        title: "Behaviors",
        expanded: true,
      });
      this._selectedBlades.push(behaviorsFolder);
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
   * Adds a top-level scene control folder to the inspector.
   * Use this from examples to expose custom runtime parameters (e.g. ball count sliders).
   * @param title The folder title shown in the UI.
   * @returns The created FolderApi instance for adding bindings.
   */
  public addSceneFolder(title: string): FolderApi {
    return (
      this._pane as unknown as {
        addFolder: (params: { title: string; expanded?: boolean }) => FolderApi;
      }
    ).addFolder({ title, expanded: true });
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

    // 2.5 Refresh the scene overview on a throttle, and only while its tab is visible --
    // a full tree walk on every single frame would be wasteful, especially in scenes with
    // thousands of objects.
    if (
      this._sceneTab.selected &&
      now - this._lastOverviewRefresh >= GadgetInspector._OVERVIEW_REFRESH_INTERVAL_MS
    ) {
      this._lastOverviewRefresh = now;
      this._refreshOverview();
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
      // Keep highlight mesh synced with the object's bounds (it may be moving --
      // a patrolling Wisp, a bobbing pickup, ...).
      const obj = this._selectedObject;
      if (obj.geometry) {
        obj.computeBounds();
      }
      this._syncHighlightMesh(obj);
    }

    if (this._selectedObject && this._objectAxes.isVisible) {
      const pos = MathPool.acquireVector();
      const rot = MathPool.acquireVector();
      const sc = MathPool.acquireVector();
      this._selectedObject.worldMatrix.decompose(pos, rot, sc);
      this._objectAxes.position.copyFrom(pos);
      this._objectAxes.rotation.copyFrom(rot);
      this._objectAxes.updateMatrixWorld();
      MathPool.releaseVector(pos);
      MathPool.releaseVector(rot);
      MathPool.releaseVector(sc);
    }
  }

  private _countSceneObjects(obj: Object3D): number {
    let count = 1;
    for (let i = 0; i < obj.children.length; i++) {
      count += this._countSceneObjects(obj.children[i]!);
    }
    return count;
  }

  public getState(): unknown {
    return null; // Gadget inspector doesn't need to save state yet
  }

  public setState(_state: unknown): void {
    // Currently no state logic implemented
  }
}
