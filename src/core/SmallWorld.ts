/// src/core/SmallWorld.ts
import { Camera } from "./Camera.js";
import { Scene } from "./Scene.js";
import { Input } from "./Input.js";
import { InteractionManager } from "./InteractionManager.js";
import { ConfigLoader } from "./ConfigLoader.js";
import { DeviceCaps, DeviceFeature, DeviceLimit } from "./DeviceCaps.js";
import { DeviceDetector } from "./DeviceDetector.js";
import { FrustumCuller } from "./FrustumCuller.js";
import { AbstractProjection } from "../math/projections/index.js";
import { ObliqueProjection } from "../math/projections/index.js";
import { OrthographicProjection } from "../math/projections/index.js";
import { PerspectiveProjection } from "../math/projections/index.js";
import { EngineOptions, ProjectionOptions, Events } from "../interfaces/index.js";
import { Renderer } from "../interfaces/index.js";
import { EventDispatcherImpl } from "./events/EventDispatcherImpl.js";
import { ProjectionType } from "../enums/index.js";
import { RendererType } from "../enums/index.js";
import { RendererFactory } from "../renderers/index.js";
import { ShaderBootstrap } from "./renderers/shaders/index.js";
import { CollisionVisualizer } from "../utils/index.js";
import { OctreeVisualizer } from "../utils/index.js";
import { GadgetInspector } from "../tools/index.js";

/** The current engine version. */
export const ENGINE_VERSION = "0.49.0";

/**
 * Base class for applications built with the SmallWorld engine.
 */
export abstract class SmallWorld {
  /** The engine configuration. */
  public config: EngineOptions;
  /** The current scene. */
  public scene: Scene;
  /** The main camera. */
  public camera: Camera;
  /** The active renderer. */
  public renderer: Renderer;
  /** The interaction manager for gamification / picking. */
  public interactionManager!: InteractionManager;
  public forge?: unknown;
  /** The canvas element. */
  public canvas!: HTMLCanvasElement;
  /** The global event dispatcher for the engine. */
  public events: Events;
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
    this.events = new EventDispatcherImpl();

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
   * Called once after the GadgetInspector is created.
   * Override in subclasses to register scene-specific inspector controls.
   * @param _inspector The newly created inspector instance.
   */

  protected onInspectorReady(_inspector: GadgetInspector): void {
    // Default: no-op
  }

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
      let jsonConfig;
      try {
        // Try GitHub Pages path first
        jsonConfig = await ConfigLoader.load("/small-world/config/small-world.json");
      } catch {
        try {
          // Fallback to local root path
          jsonConfig = await ConfigLoader.load("/config/small-world.json");
        } catch {
          console.warn("Using fallback configuration (No JSON found).");
        }
      }

      if (jsonConfig) {
        this.config = { ...this.config, ...(jsonConfig as EngineOptions), ...this._userConfig };
      }

      const tier = DeviceDetector.getPerformanceTier();
      if (tier === "LOW") {
        console.warn(
          `📉 Low Performance Tier detected (${DeviceDetector.isMobile() ? "Mobile" : "Desktop"}). Applying aggressive performance downgrades.`,
        );
        this.config.quality = {
          ...this.config.quality,
          hdr: false,
          msaa: 0,
          maxAnisotropy: 1,
          maxShadowResolution: 512,
        };
        this.config.postProcessing = {
          ...this.config.postProcessing,
          enabled: false,
        };
      } else if (tier === "MEDIUM") {
        console.log("📊 Medium Performance Tier detected. Adjusting some settings.");
        this.config.quality = {
          ...this.config.quality,
          msaa: 2,
          maxAnisotropy: 2,
        };
      } else {
        console.log("🚀 High Performance Tier detected. Running at full throttle.");
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

      console.log(
        `%c🌍 Small World Engine v${ENGINE_VERSION} initialized\n%cRenderer: ${this.renderer.constructor.name}`,
        "color: #00ffcc; font-size: 14px; font-weight: bold;",
        "color: #aaaaaa; font-size: 12px;",
      );

      this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.updateProjectionMatrix();

      this.interactionManager = new InteractionManager(this.scene, this.camera, this.canvas);

      await this.setupScene();

      if (true === this.config.enableInspector) {
        const { Forge } = await import("../tools/forge/Forge.js");
        const { GadgetInspector } = await import("../tools/GadgetInspector.js");
        const { MapGenerator } = await import("../tools/MapGenerator.js");

        // wir erstellen einen globalen Forge Hub
        this.forge = new Forge();

        // Hotkey Logik in SmallWorld verankern
        window.addEventListener("keydown", (event: KeyboardEvent) => {
          if (
            document.activeElement &&
            ("INPUT" === document.activeElement.tagName ||
              "TEXTAREA" === document.activeElement.tagName)
          ) {
            return;
          }

          if (true === event.repeat) return;

          const altLeft = Input.instance?.isPressed("AltLeft") || event.altKey;
          const metaLeft = Input.instance?.isPressed("MetaLeft") || event.metaKey;
          const ctrlLeft = Input.instance?.isPressed("ControlLeft") || event.ctrlKey;

          if (true === altLeft && (true === metaLeft || true === ctrlLeft)) {
            if ("KeyF" === event.code || "KeyM" === event.code || "KeyG" === event.code) {
              event.preventDefault();
              this.forge.toggle();

              if (this.forge.isVisible) {
                Input.preventPointerLock = true;
                if (null !== document.pointerLockElement) {
                  document.exitPointerLock();
                }
              } else {
                Input.preventPointerLock = false;
              }
            }
          }
        });

        this._inspector = new GadgetInspector(this.scene, this.camera, this.canvas, this.renderer);
        this.forge.openWindow("Inspector", this._inspector, 20, 20);

        const mapGen = new MapGenerator();
        // Read custom map if it exists, to preserve states across reloads!
        const savedMap = localStorage.getItem("yad_custom_map");
        if (savedMap) {
          mapGen.loadMapString(savedMap);
        }
        this.forge.openWindow("Map Generator", mapGen, 60, 60);

        this.onInspectorReady(this._inspector);
      }

      console.table({
        "API - WebGL1": DeviceCaps.hasFeature(DeviceFeature.WEBGL1) ? "Yes" : "No",
        "API - WebGL2": DeviceCaps.hasFeature(DeviceFeature.WEBGL2) ? "Yes" : "No",
        "API - WebGPU": DeviceCaps.hasFeature(DeviceFeature.WEBGPU) ? "Yes" : "No",
        "Max Texture Size": DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_SIZE),
        "Max Texture Units": DeviceCaps.getLimit(DeviceLimit.MAX_TEXTURE_IMAGE_UNITS),
        "Max Anisotropy": DeviceCaps.getLimit(DeviceLimit.MAX_ANISOTROPY),
        "Max Uniform Buffer Size": DeviceCaps.getLimit(DeviceLimit.MAX_UNIFORM_BUFFER_SIZE),
        "Max MSAA Samples": DeviceCaps.getLimit(DeviceLimit.MAX_MSAA_SAMPLES),
        "Max Vertex Attributes": DeviceCaps.getLimit(DeviceLimit.MAX_VERTEX_ATTRIBUTES),
        "Max Vertex Uniforms": DeviceCaps.getLimit(DeviceLimit.MAX_VERTEX_UNIFORM_VECTORS),
        "Max Fragment Uniforms": DeviceCaps.getLimit(DeviceLimit.MAX_FRAGMENT_UNIFORM_VECTORS),
        "Feature - Float Textures": DeviceCaps.hasFeature(DeviceFeature.FLOAT_TEXTURES)
          ? "Yes"
          : "No",
        "Feature - Compressed Textures": DeviceCaps.hasFeature(DeviceFeature.COMPRESSED_TEXTURES)
          ? "Yes"
          : "No",
        "Feature - Offscreen Canvas": DeviceCaps.hasFeature(DeviceFeature.OFFSCREEN_CANVAS)
          ? "Yes"
          : "No",
      });

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

    if (this.interactionManager) {
      this.interactionManager.update();
    }

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
