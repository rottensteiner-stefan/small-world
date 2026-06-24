/// src/core/SmallWorld.ts

import {
  AbstractProjection,
  ObliqueProjection,
  OrthographicProjection,
  PerspectiveProjection,
} from "../math/index.js";
import { Camera } from "./Camera.js";
import { CameraInterfaceData, EngineOptions, ProjectionOptions } from "../interfaces/index.js";
import { Renderer } from "../interfaces/Renderer.js";
import { ProjectionType, RendererType } from "../enums/index.js";
import { RendererFactory } from "../renderers/index.js";
import { Scene } from "./Scene.js";
import { Input } from "./Input.js";
import { ConfigLoader } from "./ConfigLoader.js";
import { DeviceCaps } from "./DeviceCaps.js";
import { ShaderBootstrap } from "./renderers/shaders/ShaderBootstrap.js";
import { FrustumCuller } from "./FrustumCuller.js";
import { CollisionVisualizer, OctreeVisualizer } from "../utils/index.js";
import type { GadgetInspector } from "../tools/GadgetInspector.js";

/** The current engine version. */
export const ENGINE_VERSION = "0.35.1";

/**
 * Base class for applications built with the SmallWorld engine.
 */
export abstract class SmallWorld {
  /** The engine configuration. */
  public config: EngineOptions;
  /** The current scene. */
  public scene: Scene;
  /** The main camera. */
  public camera: CameraInterfaceData;
  /** The active renderer. */
  public renderer: Renderer;
  /** The canvas element. */
  public canvas!: HTMLCanvasElement;
  /** Whether debug visualization is enabled. */
  public debug: boolean = false;

  private _inspector?: GadgetInspector;

  private _lastTime: number = 0;
  private _isRunning: boolean = false;
  private _isInitialized: boolean = false;
  private _userConfig: EngineOptions;

  /**
   * Creates a new SmallWorld application.
   * @param userConfig Optional configuration to override defaults.
   */
  protected constructor(userConfig: EngineOptions = {}) {
    this._userConfig = userConfig;
    this.config = {
      canvasId: "SmallWorld",
      rendererType: RendererType.BEST,
      projectionType: ProjectionType.PERSPECTIVE,
      fullscreen: true,
      enableInspector: true,
      ...userConfig,
    };

    this.scene = new Scene();

    const initialAspect: number = window.innerWidth / window.innerHeight;
    const projection: AbstractProjection =
      this.config.projectionInstance ??
      ((): AbstractProjection => {
        const projectionBuilders: Partial<
          Record<
            ProjectionType,
            (opts: ProjectionOptions | undefined, initialAspect: number) => AbstractProjection
          >
        > = {
          [ProjectionType.PERSPECTIVE]: PerspectiveProjection.fromConfig,
          [ProjectionType.ORTHOGRAPHIC]: OrthographicProjection.fromConfig,
          [ProjectionType.OBLIQUE]: ObliqueProjection.fromConfig,
        };
        const build =
          projectionBuilders[this.config.projectionType ?? ProjectionType.PERSPECTIVE] ??
          PerspectiveProjection.fromConfig;
        return build(this.config.projectionOptions, initialAspect);
      })();
    this.camera = new Camera(projection);
    this.renderer = undefined!; // Initialized in start()

    Input.init();
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
   * Initializes and starts the application loop.
   */
  public async start(): Promise<void> {
    if (this._isRunning) {
      return;
    }

    if (!this._isInitialized) {
      try {
        const jsonConfig = await ConfigLoader.load("/config/small-world.json");
        this.config = { ...this.config, ...(jsonConfig as EngineOptions), ...this._userConfig };
      } catch {
        console.warn("Using fallback configuration (No JSON found).");
      }

      this.canvas = document.getElementById(this.config.canvasId!) as HTMLCanvasElement;
      if (!this.canvas) {
        await new Promise<void>((resolve: () => void): void => {
          if ("loading" === document.readyState) {
            document.addEventListener("DOMContentLoaded", (): void => resolve(), { once: true });
            setTimeout((): void => {
              resolve();
            }, 500);
          } else {
            resolve();
          }
        });
        this.canvas = document.getElementById(this.config.canvasId!) as HTMLCanvasElement;
      }

      let retries: number = 0;
      while (!this.canvas && 5 > retries) {
        await new Promise<void>((resolve: () => void): void => {
          setTimeout((): void => {
            resolve();
          }, 100);
        });
        this.canvas = document.getElementById(this.config.canvasId!) as HTMLCanvasElement;
        retries++;
      }

      if (!this.canvas) {
        throw new Error(
          `[SmallWorld] Canvas element with ID '${this.config.canvasId}' not found in DOM.`,
        );
      }
      if (this.config.fullscreen) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.addEventListener("resize", (): void => {
          this.canvas.width = window.innerWidth;
          this.canvas.height = window.innerHeight;
          this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
          this.camera.updateProjectionMatrix();
          if (this.renderer) {
            this.renderer.setSize(this.canvas.width, this.canvas.height);
          }
        });
      } else if (this.config.width && this.config.height) {
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;
      }

      await ShaderBootstrap.init();

      DeviceCaps.init();

      this.renderer = await RendererFactory.create(
        this.config.rendererType!,
        this.canvas,
        this.config,
      );

      this.renderer.setSize(this.canvas.width, this.canvas.height);

      this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.updateProjectionMatrix();

      await this.setupScene();

      if (true === this.config.enableInspector) {
        const { GadgetInspector } = await import("../tools/GadgetInspector.js");
        this._inspector = new GadgetInspector(this.scene, this.camera, this.canvas, this.renderer);
      }

      this._isInitialized = true;
    }

    this._isRunning = true;
    this._lastTime = performance.now();
    requestAnimationFrame((time: number) => this._loop(time));
  }

  /**
   * Stops the application loop.
   */
  public stop(): void {
    this._isRunning = false;
  }

  /**
   * The main application loop.
   * @param currentTime The current timestamp.
   */
  private _loop(currentTime: number): void {
    if (!this._isRunning) {
      return;
    }

    const deltaTime: number = Math.min((currentTime - this._lastTime) / 1000.0, 0.1);
    this._lastTime = currentTime;

    Input.update();
    this.update(deltaTime);

    if (this._inspector) {
      this._inspector.update();
    }

    this.scene.update(deltaTime);
    this.scene.updateLights(this.camera);
    this.camera.update(this.camera.target, 0, 0, deltaTime);

    FrustumCuller.cull(this.scene, this.camera.viewProjectionMatrix4);

    if (this.debug) {
      CollisionVisualizer.instance.update(this.scene);
      OctreeVisualizer.instance.update(this.scene, FrustumCuller.lastIntersectedNodes);
    }

    this.renderer.render(
      this.scene,
      this.camera.viewProjectionMatrix,
      this.camera.position,
      this.camera.viewMatrix,
    );

    Input.mouse.dx = 0;
    Input.mouse.dy = 0;
    Input.mouse.wheelX = 0;
    Input.mouse.wheelY = 0;
    Input.mouse.zoom = 0;

    requestAnimationFrame((time: number) => this._loop(time));
  }
}
