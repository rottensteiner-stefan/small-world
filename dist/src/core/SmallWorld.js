/// src/core/SmallWorld.ts
import { ObliqueProjection, OrthographicProjection, PerspectiveProjection, } from "../math/index.js";
import { Camera } from "./Camera.js";
import { ProjectionType, RendererType } from "../enums/index.js";
import { RendererFactory } from "../renderers/index.js";
import { Scene } from "./Scene.js";
import { Input } from "./Input.js";
import { ConfigLoader } from "./ConfigLoader.js";
import { DeviceCaps } from "./DeviceCaps.js";
import { ShaderBootstrap } from "./renderers/shaders/ShaderBootstrap.js";
import { FrustumCuller } from "./FrustumCuller.js";
import { CollisionVisualizer, OctreeVisualizer } from "../utils/index.js";
/** The current engine version. */
export const ENGINE_VERSION = "0.30.0";
/**
 * Base class for applications built with the SmallWorld engine.
 */
export class SmallWorld {
    /** The engine configuration. */
    config;
    /** The current scene. */
    scene;
    /** The main camera. */
    camera;
    /** The active renderer. */
    renderer;
    /** The canvas element. */
    canvas;
    /** Whether debug visualization is enabled. */
    debug = false;
    _inspector;
    _lastTime = 0;
    _isRunning = false;
    _isInitialized = false;
    _userConfig;
    /**
     * Creates a new SmallWorld application.
     * @param userConfig Optional configuration to override defaults.
     */
    constructor(userConfig = {}) {
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
        const initialAspect = window.innerWidth / window.innerHeight;
        const projection = this.config.projectionInstance ??
            (() => {
                const projectionBuilders = {
                    [ProjectionType.PERSPECTIVE]: PerspectiveProjection.fromConfig,
                    [ProjectionType.ORTHOGRAPHIC]: OrthographicProjection.fromConfig,
                    [ProjectionType.OBLIQUE]: ObliqueProjection.fromConfig,
                };
                const build = projectionBuilders[this.config.projectionType ?? ProjectionType.PERSPECTIVE] ??
                    PerspectiveProjection.fromConfig;
                return build(this.config.projectionOptions, initialAspect);
            })();
        this.camera = new Camera(projection);
        this.renderer = undefined; // Initialized in start()
        Input.init();
    }
    /**
     * Initializes and starts the application loop.
     */
    async start() {
        if (this._isRunning) {
            return;
        }
        if (!this._isInitialized) {
            try {
                const jsonConfig = await ConfigLoader.load("/config/small-world.json");
                this.config = { ...this.config, ...jsonConfig, ...this._userConfig };
            }
            catch {
                console.warn("Using fallback configuration (No JSON found).");
            }
            this.canvas = document.getElementById(this.config.canvasId);
            if (!this.canvas) {
                await new Promise((resolve) => {
                    if ("loading" === document.readyState) {
                        document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
                        setTimeout(() => {
                            resolve();
                        }, 500);
                    }
                    else {
                        resolve();
                    }
                });
                this.canvas = document.getElementById(this.config.canvasId);
            }
            let retries = 0;
            while (!this.canvas && 5 > retries) {
                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 100);
                });
                this.canvas = document.getElementById(this.config.canvasId);
                retries++;
            }
            if (!this.canvas) {
                throw new Error(`[SmallWorld] Canvas element with ID '${this.config.canvasId}' not found in DOM.`);
            }
            if (this.config.fullscreen) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                window.addEventListener("resize", () => {
                    this.canvas.width = window.innerWidth;
                    this.canvas.height = window.innerHeight;
                    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
                    this.camera.updateProjectionMatrix();
                    if (this.renderer) {
                        this.renderer.setSize(this.canvas.width, this.canvas.height);
                    }
                });
            }
            else if (this.config.width && this.config.height) {
                this.canvas.width = this.config.width;
                this.canvas.height = this.config.height;
            }
            await ShaderBootstrap.init();
            DeviceCaps.init();
            this.renderer = await RendererFactory.create(this.config.rendererType, this.canvas, this.config);
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
        requestAnimationFrame((time) => this._loop(time));
    }
    /**
     * Stops the application loop.
     */
    stop() {
        this._isRunning = false;
    }
    /**
     * The main application loop.
     * @param currentTime The current timestamp.
     */
    _loop(currentTime) {
        if (!this._isRunning) {
            return;
        }
        const deltaTime = Math.min((currentTime - this._lastTime) / 1000.0, 0.1);
        this._lastTime = currentTime;
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
        this.renderer.render(this.scene, this.camera.viewProjectionMatrix, this.camera.position, this.camera.viewMatrix);
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;
        Input.mouse.wheelX = 0;
        Input.mouse.wheelY = 0;
        Input.mouse.zoom = 0;
        requestAnimationFrame((time) => this._loop(time));
    }
}
//# sourceMappingURL=SmallWorld.js.map