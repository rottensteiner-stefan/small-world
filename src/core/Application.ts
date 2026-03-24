/// src/core/Application.ts
import { AbstractProjection } from "../math/projections/AbstractProjection.js";
import { Camera } from "./Camera.js";
import { CameraInterface } from "../interfaces/CameraInterface.js";
import { EngineConfigInterface } from "../interfaces/EngineConfigInterface.js";
import { RendererInterface } from "../interfaces/RendererInterface.js";
import { ObliqueProjection } from "../math/projections/ObliqueProjection.js";
import { OrthographicProjection } from "../math/projections/OrthographicProjection.js";
import { PerspectiveProjection } from "../math/projections/PerspectiveProjection.js";
import { ProjectionType } from "../enums/ProjectionType.js";
import { RendererFactory } from "../renderers/RendererFactory.js";
import { RendererType } from "../enums/RendererType.js";
import { Scene } from "./Scene.js";

/**
 * Base class for applications built with the SmallWorld engine.
 */
export abstract class Application {
  /** The engine configuration. */
  public config: EngineConfigInterface;
  /** The current scene. */
  public scene: Scene;
  /** The main camera. */
  public camera: CameraInterface;
  /** The active renderer. */
  protected _renderer!: RendererInterface;
  /** The canvas element. */
  protected _canvas!: HTMLCanvasElement;

  private _lastTime: number = 0;
  private _isRunning: boolean = false;

  /**
   * Creates a new application.
   * @param userConfig Optional configuration to override defaults.
   */
  constructor(userConfig: EngineConfigInterface = {}) {
    this.config = {
      canvasId: "canvas",
      renderer: RendererType.WEB_GPU,
      projection: ProjectionType.PERSPECTIVE,
      fullscreen: true,
      ...userConfig,
    };

    this.scene = new Scene();

    const aspect: number = window.innerWidth / window.innerHeight;
    let projection: AbstractProjection;

    if (this.config.projection === ProjectionType.ORTHOGRAPHIC) {
      projection = new OrthographicProjection(-10 * aspect, 10 * aspect, -10, 10, 0.1, 1000);
    } else if (this.config.projection === ProjectionType.OBLIQUE) {
      projection = new ObliqueProjection(-10 * aspect, 10 * aspect, -10, 10, 0.1, 1000);
    } else {
      projection = new PerspectiveProjection(75, aspect, 0.1, 1000);
    }

    this.camera = new Camera(projection);
  }

  /**
   * Called to setup the scene after the engine is initialized.
   */
  protected abstract setupScene(): Promise<void>;
  /**
   * Called every frame to update application logic.
   * @param deltaTime Time elapsed since the last frame in seconds.
   */
  protected abstract update(deltaTime: number): void;

  /**
   * Starts the application loop.
   */
  public async start(): Promise<void> {
    try {
      const response: Response = await fetch("/config/small-world.json");
      if (response.ok) {
        const jsonConfig: unknown = await response.json();
        this.config = { ...this.config, ...(jsonConfig as EngineConfigInterface) };
      }
    } catch {
      console.warn("Nutze Fallback-Config (Keine JSON gefunden).");
    }

    console.debug("Canvas ID: " + this.config.canvasId);
    this._canvas = document.getElementById(this.config.canvasId!) as HTMLCanvasElement;
    if (this.config.fullscreen) {
      this._canvas.width = window.innerWidth;
      this._canvas.height = window.innerHeight;
      window.addEventListener("resize", () => {
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;
        this.camera.aspect = this._canvas.width / this._canvas.height;
        this.camera.updateProjectionMatrix();
        if (this._renderer) {
          this._renderer.setSize(this._canvas.width, this._canvas.height);
        }
      });
    } else if (this.config.width && this.config.height) {
      this._canvas.width = this.config.width;
      this._canvas.height = this.config.height;
    }

    this._renderer = await RendererFactory.create(this.config.renderer!, this._canvas);

    await this.setupScene();

    this._isRunning = true;
    this._lastTime = performance.now();
    requestAnimationFrame((time: number) => this.loop(time));
  }

  /**
   * The main application loop.
   * @param currentTime The current timestamp.
   */
  private loop(currentTime: number): void {
    if (!this._isRunning) {
      return;
    }

    const deltaTime: number = (currentTime - this._lastTime) / 1000.0;
    this._lastTime = currentTime;

    this.update(deltaTime);

    this.scene.update();
    this.camera.updateViewMatrix();

    this._renderer.render(this.scene, this.camera.viewProjectionMatrix, this.camera.position);

    requestAnimationFrame((time: number) => this.loop(time));
  }
}
