import { TabPageApi } from "tweakpane";
import { Scene, Object3D, FrustumCuller } from "../../core/index.js";
import { Renderer } from "../../interfaces/index.js";
import { RefreshableBinding, InspectorStats } from "./types.js";

/**
 * Manages performance stats, diagnostics bindings, and resolution updates in GadgetInspector.
 */
export class InspectorDiagnostics {
  public stats: InspectorStats = {
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

  constructor(
    statsTab: TabPageApi,
    renderTab: TabPageApi,
    renderer: Renderer | undefined = undefined,
  ) {
    if (undefined !== renderer) {
      this.stats.renderer = renderer.constructor.name;
    }

    const diagFolder = statsTab.addFolder({ title: "Diagnostics", expanded: true });
    diagFolder.addBinding(this.stats, "renderer", { readonly: true, label: "Renderer" });
    this._resolutionBinding = diagFolder.addBinding(this.stats, "resolution", {
      readonly: true,
      label: "Resolution",
    });
    this._fpsBinding = diagFolder.addBinding(this.stats, "fps", { readonly: true, label: "FPS" });
    this._objectsBinding = diagFolder.addBinding(this.stats, "objects", {
      readonly: true,
      label: "Total Objects",
    });
    this._visibleBinding = diagFolder.addBinding(this.stats, "visible", {
      readonly: true,
      label: "Visible Objects",
    });

    if (renderer && renderer.quality) {
      const renderFolder = renderTab.addFolder({ title: "Renderer Settings", expanded: true });
      renderFolder.addBinding(renderer.quality, "disableTextures", {
        label: "Disable Textures",
      });
    }
  }

  /**
   * Updates FPS, resolution, total objects, and visible frustum counts.
   */
  public update(scene: Scene, canvas: HTMLCanvasElement): void {
    const now = performance.now();
    this._frameCount++;

    if (1000 <= now - this._lastFpsUpdate) {
      this.stats.fps = Math.round((this._frameCount * 1000) / (now - this._lastFpsUpdate));
      this._frameCount = 0;
      this._lastFpsUpdate = now;
      this._fpsBinding?.refresh();
    }

    const resString = `${canvas.width}x${canvas.height}`;
    if (this.stats.resolution !== resString) {
      this.stats.resolution = resString;
      this._resolutionBinding?.refresh();
    }

    let totalObjects = 0;
    for (let i = 0; i < scene.objects.length; i++) {
      totalObjects += this._countSceneObjects(scene.objects[i]!);
    }
    this.stats.objects = totalObjects;
    this._objectsBinding?.refresh();

    this.stats.visible = FrustumCuller.lastVisibleCount;
    this._visibleBinding?.refresh();
  }

  public resetFps(): void {
    this._lastFpsUpdate = performance.now();
    this._frameCount = 0;
  }

  private _countSceneObjects(obj: Object3D): number {
    let count = 1;
    for (let i = 0; i < obj.children.length; i++) {
      count += this._countSceneObjects(obj.children[i]!);
    }
    return count;
  }
}
