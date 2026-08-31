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
  private static readonly _OVERVIEW_REFRESH_INTERVAL_MS = 1500;
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
    _renderer: Renderer | undefined = undefined,
    options: ForgeToolOptions = {},
  ) {
    super(options);

    // 1. Initialize Tweakpane
    this._pane = new Pane({ container: this._container });
    this._pane.registerPlugin(CamerakitPlugin);
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

    // 2. Initialize Gizmos & Visual Helpers
    this._gizmos = new InspectorGizmos(this._scene);

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

    // 4. Search Object feature
    this._setupSearchTab(searchTab);

    // 5. Diagnostics & Renderer Quality
    this._diagnostics = new InspectorDiagnostics(statsTab, renderTab, _renderer);

    // 6. Device Capabilities
    InspectorDeviceCaps.setupCapabilities(statsTab);

    // 7. Audio Mixer
    InspectorAudio.setupAudioFolder(audioTab);

    // 8. Setup Interaction
    this._canvas.addEventListener("pointerdown", (event: PointerEvent) => {
      if (!this.isInspectorOpen()) return;
      this._onPointerDown(event);
    });

    this._canvas.addEventListener("dblclick", (event: MouseEvent) => {
      if (!this.isInspectorOpen()) return;
      this._onDoubleClick(event);
    });
  }

  private _setupSearchTab(searchTab: TabPageApi): void {
    const searchParams = { name: "" };
    const searchResultBlades: DisposableBlade[] = [];

    const binding = searchTab.addBinding(searchParams, "name", { label: "🔍" });
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
  }

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

  private _groupKeyFor(obj: Object3D): string {
    const base = obj.name && "" !== obj.name.trim() ? obj.name.trim() : obj.constructor.name;
    const stripped = base.replace(/[\s_-]?\d+$/, "");
    return "" !== stripped ? stripped : base;
  }

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
    if (0 !== event.button) return;

    const rect = this._canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this._mouse.x = (x / rect.width) * 2 - 1;
    this._mouse.y = -(y / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this._camera);

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

  private _onDoubleClick(event: MouseEvent): void {
    if (0 !== event.button) return;

    const rect = this._canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this._mouse.x = (x / rect.width) * 2 - 1;
    this._mouse.y = -(y / rect.height) * 2 + 1;

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

  public isInspectorOpen(): boolean {
    if (typeof document === "undefined") return false;
    const overlay = this._container.closest(".swf-forge-overlay") as HTMLElement | null;
    if (overlay && "none" === overlay.style.display) return false;
    const win = this._container.closest(".swf-window") as HTMLElement | null;
    if (win && "none" === win.style.display) return false;
    return "none" !== this._pane.element.style.display;
  }

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

  public addSceneFolder(title: string): FolderApi {
    return (
      this._pane as unknown as {
        addFolder: (params: { title: string; expanded?: boolean }) => FolderApi;
      }
    ).addFolder({ title, expanded: true });
  }

  public update(): void {
    const isHidden = "none" === this._pane.element.style.display;
    if (true === isHidden) {
      this._diagnostics.resetFps();
      return;
    }

    this._diagnostics.update(this._scene, this._canvas);

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
    return null;
  }

  public setState(_state: unknown): void {}
}
