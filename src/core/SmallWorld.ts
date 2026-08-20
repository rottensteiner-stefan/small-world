import { Camera } from "./Camera.js";
import { Scene } from "./Scene.js";
import { Input } from "./Input.js";
import { InteractionManager } from "./InteractionManager.js";
import { AudioSystem } from "../audio/AudioSystem.js";
import { EventDispatcherImpl } from "./events/EventDispatcherImpl.js";
import { DeviceCaps, DeviceFeature, DeviceLimit } from "./DeviceCaps.js";
import { FrustumCuller } from "./FrustumCuller.js";
import {
  AbstractProjection,
  ObliqueProjection,
  OrthographicProjection,
  PerspectiveProjection,
} from "../math/projections/index.js";
import { EngineOptions, ProjectionOptions, Renderer } from "../interfaces/index.js";
import { ProjectionType, RendererType, PostProcessingEffectType } from "../enums/index.js";
import { RendererFactory } from "../renderers/index.js";
import { ShaderBootstrap } from "./renderers/shaders/index.js";
import { CollisionVisualizer, OctreeVisualizer } from "../utils/index.js";
import { GadgetInspector } from "../tools/GadgetInspector.js";
import { PhysicsSystem } from "../physix/PhysicsSystem.js";

/** The current engine version. */
export const ENGINE_VERSION = "0.76.12";

/**
 * Halton low-discrepancy sequence, used for TAA's per-frame sub-pixel camera jitter -- covers
 * sub-pixel offsets more evenly over a short cycle than a random or simple grid pattern would.
 * @param index 1-based sample index.
 * @param base Prime base (2 and 3 are the standard pairing for 2D jitter).
 */
function halton(index: number, base: number): number {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (0 < i) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

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
  /** The built-in physics system. Stepped automatically each frame when `config.enablePhysics` is true. */
  public physics: PhysicsSystem;
  /** The interaction manager for gamification / picking. */
  public interactionManager!: InteractionManager;
  public readonly input: Input = new Input();
  public readonly audio: AudioSystem = new AudioSystem();
  private readonly _octreeVisualizer: OctreeVisualizer = new OctreeVisualizer();
  private readonly _collisionVisualizer: CollisionVisualizer = new CollisionVisualizer();
  public forge!: import("../tools/forge/Forge.js").Forge;
  /** The canvas element. */
  public canvas!: HTMLCanvasElement;
  /** Whether debug visualization is enabled. */
  public debug: boolean = false;

  /** The global event bus for this engine instance. */
  public events: EventDispatcherImpl = new EventDispatcherImpl();

  private _inspector?: GadgetInspector;

  private _lastTime: number = 0;
  private _isRunning: boolean = false;
  private _isInitialized: boolean = false;
  private _hitStopRemaining: number = 0;
  private _hitStopScale: number = 1;
  private _taaFrameIndex: number = 0;

  /**
   * Creates a new SmallWorld application.
   * @param userConfig Optional configuration to override defaults.
   */
  protected constructor(userConfig: EngineOptions = {}) {
    this.config = {
      canvasId: "SmallWorld",
      rendererType: RendererType.DEFAULT,
      projectionType: ProjectionType.DEFAULT,
      fullscreen: true,
      enableInspector: false,
      ...userConfig,
    };

    this.scene = new Scene();

    this.physics = new PhysicsSystem(this.events);
    if (this.config.gravity) {
      this.physics.gravity.set(...this.config.gravity);
    }

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
          projectionBuilders[this.config.projectionType ?? ProjectionType.DEFAULT] ??
          PerspectiveProjection.fromConfig;
        return build(this.config.projectionOptions, initialAspect);
      })();
    this.camera = new Camera(projection);
    this.renderer = undefined!; // Initialized in start()

    this.input.init();

    // Bind GadgetInspector audio events
    if (typeof window !== "undefined") {
      window.addEventListener("gadget:audio:master", (e: Event) =>
        this.audio.setMasterVolume((e as CustomEvent).detail),
      );
      window.addEventListener("gadget:audio:music", (e: Event) =>
        this.audio.setMusicVolume((e as CustomEvent).detail),
      );
      window.addEventListener("gadget:audio:sfx", (e: Event) =>
        this.audio.setSFXVolume((e as CustomEvent).detail),
      );
      window.addEventListener("gadget:audio:reverb", (e: Event) =>
        this.audio.setReverbLevel((e as CustomEvent).detail),
      );
    }
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
      const autoDowngrade = this.config.quality?.autoDowngrade ?? true;
      if (autoDowngrade) {
        const tier = DeviceCaps.getPerformanceTier();
        if (tier === "LOW") {
          console.warn(
            `📉 Low Performance Tier detected (${DeviceCaps.isMobile() ? "Mobile" : "Desktop"}). Applying aggressive performance downgrades.`,
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
          this.config.quality = {
            ...this.config.quality,
            msaa: 2,
            maxAnisotropy: 2,
          };
        } else {
          // High tier, no overrides needed
        }
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
        window.addEventListener("resize", this._onResize);
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

      if (!(window as unknown as Record<string, boolean>)["__SMALLWORLD_BANNER__"]) {
        (window as unknown as Record<string, boolean>)["__SMALLWORLD_BANNER__"] = true;
        const bannerStyle1 =
          "font-size: 24px; font-weight: bold; font-family: sans-serif; color: #B000FF; text-shadow: 0 0 10px rgba(176, 0, 255, 0.5); line-height: 30px;";

        const bannerStyle3 = "font-size: 12px; font-family: sans-serif; color: #aaa;";
        console.log(
          `%c Small World Engine, v${ENGINE_VERSION} %c\n\n%c A very small 3D engine focusing on raw WebGL performance.\n https://github.com/rottensteiner-stefan/small-world\n\n`,
          bannerStyle1,
          "",
          bannerStyle3,
        );
        const rendererLabels: Record<string, string> = {
          [RendererType.WEB_GPU]: "WebGPU",
          [RendererType.WEB_GL2]: "WebGL2",
          [RendererType.WEB_GL1]: "WebGL1",
        };
        console.table({
          "Active Renderer": rendererLabels[this.renderer.type] ?? this.renderer.type,
          "Device Type": DeviceCaps.isMobile() ? "Mobile" : "Desktop",
          "Performance Tier": DeviceCaps.getPerformanceTier(),
          "GPU Model": DeviceCaps.gpuModel,
          "GPU Vendor": DeviceCaps.gpuVendor,
          "CPU Cores": DeviceCaps.cores,
          "Memory (GB)": DeviceCaps.memoryGB,
          "Screen Resolution": `${DeviceCaps.screenWidth}x${DeviceCaps.screenHeight}`,
          "Pixel Ratio": DeviceCaps.pixelRatio,
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
          Network: DeviceCaps.networkInfo
            ? `${DeviceCaps.networkInfo.effectiveType}, ${DeviceCaps.networkInfo.downlink}Mbps${DeviceCaps.networkInfo.saveData ? ", data saver" : ""}`
            : "N/A",
        });
      }

      this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.updateProjectionMatrix();

      this.interactionManager = new InteractionManager(
        this.scene,
        this.camera,
        this.canvas,
        this.input,
      );

      await this.setupScene();

      if (true === this.config.enableInspector) {
        const { Forge } = await import("../tools/forge/Forge.js");
        const { GadgetInspector } = await import("../tools/GadgetInspector.js");
        const { MapGenerator } = await import("../tools/MapGenerator.js");
        const { Pixler } = await import("../tools/Pixler.js");
        const { Xtractor } = await import("../tools/Xtractor.js");
        const { MaterialStudio } = await import("../tools/MaterialStudio.js");

        // Create a global Forge hub
        this.forge = new Forge();

        // Anchor hotkey logic in SmallWorld
        window.addEventListener("keydown", this._onKeyDown);

        this._inspector = new GadgetInspector(this.scene, this.camera, this.canvas, this.renderer);
        this.forge.openWindow("Gadget Inspector", this._inspector, 20, 20, "gadgetInspector");

        const mapGen = new MapGenerator();
        // Read custom map if it exists, to preserve states across reloads!
        const savedMap = localStorage.getItem("yad_custom_map");
        if (savedMap) {
          mapGen.loadMapString(savedMap);
        }
        this.forge.openWindow("Map Generator", mapGen, 60, 60, "mapGenerator");

        this.forge.openWindow("Pixler Editor", new Pixler(this.events), 50, 200, "pixlerEditor");
        this.forge.openWindow(
          "Asset Extractor",
          new Xtractor(this.events),
          400,
          60,
          "assetExtractor",
        );
        this.forge.openWindow("Material Studio", new MaterialStudio(), 750, 60, "materialStudio");

        this.onInspectorReady(this._inspector);
      }

      this._isInitialized = true;
    }

    window.addEventListener("pagehide", this._onPageHide);
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
   * Briefly slows down gameplay (app update, physics, scene behaviors) to sell the impact of a
   * hit, while the camera and its effects (e.g. shake) keep running in real time. Rendering and
   * input are unaffected.
   * @param duration Real-time seconds the slowdown lasts.
   * @param timeScale Multiplier applied to deltaTime for gameplay systems while active. Default 0.05 (near-freeze).
   */
  public triggerHitStop(duration: number, timeScale: number = 0.05): void {
    this._hitStopRemaining = duration;
    this._hitStopScale = timeScale;
  }

  /**
   * Destroys the engine instance, freeing memory and removing all global event listeners.
   */
  public destroy(): void {
    this.stop();
    this._isInitialized = false;

    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("pagehide", this._onPageHide);

    if (this.renderer && this.renderer.destroy) {
      this.renderer.destroy();
    }
  }

  private _onPageHide = (): void => {
    this.destroy();
  };

  private _onResize = (): void => {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    if (this.renderer) {
      this.renderer.setSize(this.canvas.width, this.canvas.height);
    }
  };

  private _onKeyDown = (event: KeyboardEvent): void => {
    if (
      document.activeElement &&
      ("INPUT" === document.activeElement.tagName || "TEXTAREA" === document.activeElement.tagName)
    ) {
      return;
    }

    if (true === event.repeat) return;

    const altLeft = this.input.isPressed("AltLeft") || event.altKey;
    const metaLeft = this.input.isPressed("MetaLeft") || event.metaKey;
    const ctrlLeft = this.input.isPressed("ControlLeft") || event.ctrlKey;

    if (true === altLeft && (true === metaLeft || true === ctrlLeft)) {
      if ("KeyG" === event.code && this.forge) {
        event.preventDefault();
        this.forge.toggle();

        if (this.forge.isVisible) {
          this.input.preventPointerLock = true;
          if (null !== document.pointerLockElement) {
            document.exitPointerLock();
          }
        } else {
          this.input.preventPointerLock = false;
        }
      }
    }
  };

  /**
   * The main application loop.
   * @param currentTime The current timestamp.
   */
  private _loop(currentTime: number): void {
    if (!this._isRunning) {
      return;
    }

    if (this.canvas && !document.body.contains(this.canvas)) {
      console.warn("[SmallWorld] Canvas removed from DOM. Auto-destroying engine.");
      this.destroy();
      return;
    }

    const deltaTime: number = Math.min((currentTime - this._lastTime) / 1000.0, 0.1);
    this._lastTime = currentTime;

    let gameplayDeltaTime: number = deltaTime;
    if (0 < this._hitStopRemaining) {
      gameplayDeltaTime = deltaTime * this._hitStopScale;
      this._hitStopRemaining -= deltaTime;
    }

    this.input.update();
    this.update(gameplayDeltaTime);

    if (this._inspector) {
      this._inspector.update();
    }

    if (this.config.enablePhysics) {
      this.physics.step(this.scene, gameplayDeltaTime);
    }

    this.scene.update(gameplayDeltaTime);
    this.scene.updateLights(this.camera);

    // TAA sub-pixel jitter: baked into the camera's view-projection matrix by updateViewMatrix()
    // below (via camera.update() -> ... -> updateViewMatrix()). Only applied while TAA is
    // enabled and the canvas has a real size, and reset to 0 otherwise so toggling TAA off
    // doesn't leave a stale offset baked into the camera.
    const taaNode = this.renderer.postProcessing.get<
      import("../renderers/post/index.js").TaaElement
    >(PostProcessingEffectType.TAA);
    if (taaNode && taaNode.enabled && 0 < this.canvas.clientWidth && 0 < this.canvas.clientHeight) {
      this._taaFrameIndex = (this._taaFrameIndex % 16) + 1;
      const jitterScale = 1.0; // in texels
      this.camera.jitterX =
        ((halton(this._taaFrameIndex, 2) - 0.5) * 2.0 * jitterScale) / this.canvas.clientWidth;
      this.camera.jitterY =
        ((halton(this._taaFrameIndex, 3) - 0.5) * 2.0 * jitterScale) / this.canvas.clientHeight;
    } else {
      this.camera.jitterX = 0;
      this.camera.jitterY = 0;
    }

    // Real deltaTime, not gameplayDeltaTime: the camera (and its shake/flash effects) keeps
    // running at full speed during hit-stop, which is what sells the freeze-frame impact.
    this.camera.update(this.camera.target, 0, 0, deltaTime);

    if (this.interactionManager) {
      this.interactionManager.update();
    }

    FrustumCuller.cull(this.scene, this.camera.viewProjectionMatrix4);

    if (this.config.enablePhysics) {
      this.physics.applyRenderInterpolation();
    }

    if (this.debug) {
      this._collisionVisualizer.update(this.scene);
      this._octreeVisualizer.update(this.scene, FrustumCuller.lastIntersectedNodes);
    }

    if (this.canvas.clientWidth > 0 && this.canvas.clientHeight > 0) {
      // HBAO's view-space reconstruction assumes a symmetric perspective projection matrix;
      // leave it undefined for other projection types so the effect just no-ops there.
      const projMatrix: Float32Array | undefined =
        this.camera.projection.type === ProjectionType.PERSPECTIVE
          ? this.camera.projection.getMatrix().data
          : undefined;

      this.renderer.render(
        this.scene,
        this.camera.viewProjectionMatrix,
        this.camera.position,
        this.camera.viewMatrix,
        this.camera.projection.near,
        this.camera.projection.far,
        projMatrix,
      );
    }

    this.input.mouse.dx = 0;
    this.input.mouse.dy = 0;
    this.input.mouse.wheelX = 0;
    this.input.mouse.wheelY = 0;
    this.input.mouse.zoom = 0;

    requestAnimationFrame((time: number) => this._loop(time));
  }
}
