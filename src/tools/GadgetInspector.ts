import { Pane, FolderApi, TabPageApi } from "tweakpane";
import * as CamerakitPlugin from "@kitschpatrol/tweakpane-plugin-camerakit";
import { Scene, Object3D } from "../core/index.js";
import { CameraInterfaceData, Renderer } from "../interfaces/index.js";
import { Raycaster } from "../physix/index.js";
import { Vector2D } from "../math/index.js";
import { ForgeTool, ForgeToolOptions } from "./forge/ForgeTool.js";
import {
  DisposableBlade,
  InspectorAudio,
  InspectorDeviceCaps,
  InspectorDiagnostics,
  InspectorGizmos,
  InspectorSelection,
} from "./inspector/index.js";

/**
 * A lightweight editor/inspector overlay for small-world.
 * Uses Raycasting for object picking and Tweakpane for property editing.
 */
export class GadgetInspector extends ForgeTool {
  private _pane: Pane;
  private _raycaster = new Raycaster();
  private _mouse = new Vector2D();
  private _selectedObject: Object3D | null = null;
  private _gizmos: InspectorGizmos;
  private _diagnostics: InspectorDiagnostics;
  private _sceneTab!: TabPageApi;
  private _selectedFolder!: FolderApi;
  private _selectedBlades: DisposableBlade[] = [];

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

    // 2. Gizmos (highlight mesh + world/object axes helpers) -- created early since
    // `_refreshOverview()` below (via `_getAllObjects`) needs to exclude them.
    this._gizmos = new InspectorGizmos(this._scene);

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
      .addBinding(this._gizmos.axesSettings, "showWorldAxes", { label: "World Axes" })
      .on("change", (ev: { value: boolean }) => {
        this._gizmos.worldAxes.isVisible = ev.value;
      });
    helpersFolder
      .addBinding(this._gizmos.axesSettings, "showObjectAxes", { label: "Object Axes" })
      .on("change", (ev: { value: boolean }) => {
        this._gizmos.objectAxes.isVisible = ev.value && null !== this._selectedObject;
      });
    helpersFolder
      .addBinding(this._gizmos.axesSettings, "axesScale", {
        label: "Axes Scale",
        min: 0.1,
        max: 5.0,
        step: 0.1,
      })
      .on("change", (ev: { value: number }) => {
        this._gizmos.worldAxes.scale.set(ev.value, ev.value, ev.value);
        this._gizmos.objectAxes.scale.set(ev.value, ev.value, ev.value);
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

    // Setup Diagnostics + Renderer Settings folders
    this._diagnostics = new InspectorDiagnostics(statsTab, renderTab, this._renderer);

    // Setup Capabilities folder
    InspectorDeviceCaps.setupCapabilities(statsTab);

    // Setup Audio Mixer folder
    InspectorAudio.setupAudioFolder(audioTab);

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
    if (this._gizmos.isGizmoObject(parent)) {
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
    this._gizmos.highlightMesh.isVisible = this._gizmos.syncHighlightMesh(obj);
    this._gizmos.objectAxes.isVisible = this._gizmos.axesSettings.showObjectAxes;

    InspectorSelection.buildGUI(obj, this._selectedFolder, this._selectedBlades, (target) =>
      this.selectObject(target),
    );
    this._sceneTab.selected = true;
    this._selectedFolder.expanded = true;
    this._selectedFolder.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * Deselects the current object.
   */
  public deselect(): void {
    this._selectedObject = null;
    this._gizmos.highlightMesh.isVisible = false;
    this._gizmos.objectAxes.isVisible = false;
    for (const blade of this._selectedBlades) {
      blade.dispose();
    }
    this._selectedBlades.length = 0;
    this._selectedFolder.title = "🎯 No Object Selected";
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
      this._diagnostics.resetFps();
      return;
    }

    this._diagnostics.update(this._scene, this._canvas);

    // Refresh the scene overview on a throttle, and only while its tab is visible -- a full
    // tree walk on every single frame would be wasteful, especially in scenes with thousands
    // of objects.
    const now = performance.now();
    if (
      this._sceneTab.selected &&
      now - this._lastOverviewRefresh >= GadgetInspector._OVERVIEW_REFRESH_INTERVAL_MS
    ) {
      this._lastOverviewRefresh = now;
      this._refreshOverview();
    }

    this._gizmos.update(this._selectedObject);
  }

  public getState(): unknown {
    return null; // Gadget inspector doesn't need to save state yet
  }

  public setState(_state: unknown): void {
    // Currently no state logic implemented
  }
}
