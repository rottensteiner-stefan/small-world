/// src/core/Application.ts
import { ObliqueProjection, OrthographicProjection, PerspectiveProjection, } from "../math/index.js";
import { Camera } from "./Camera.js";
import { ProjectionType, RendererType } from "../enums/index.js";
import { RendererFactory } from "../renderers/index.js";
import { Scene } from "./Scene.js";
import { Input } from "./Input.js";
import { ConfigLoader } from "./ConfigLoader.js";
import { MathUtils } from "../math/MathUtils.js";
import { ShaderBootstrap } from "./renderers/shaders/ShaderBootstrap.js";
import { FrustumCuller } from "./FrustumCuller.js";
import { CollisionVisualizer, OctreeVisualizer } from "../utils/index.js";
/**
 * Base class for applications built with the SmallWorld engine.
 */
export class Application {
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
    /** List of active input controllers. */
    controllers = [];
    _lastTime = 0;
    _isRunning = false;
    _isInitialized = false;
    /**
     * Creates a new application.
     * @param userConfig Optional configuration to override defaults.
     */
    constructor(userConfig = {}) {
        this.config = {
            canvasId: "SmallWorld",
            rendererType: RendererType.WEB_GPU,
            projection: ProjectionType.PERSPECTIVE,
            fullscreen: true,
            ...userConfig,
        };
        this.scene = new Scene();
        const aspect = window.innerWidth / window.innerHeight;
        let projection;
        if (ProjectionType.ORTHOGRAPHIC === this.config.projection) {
            projection = new OrthographicProjection({
                left: -10 * aspect,
                right: 10 * aspect,
                bottom: -10,
                top: 10,
                near: 0.1,
                far: 1000,
            });
        }
        else if (ProjectionType.OBLIQUE === this.config.projection) {
            projection = new ObliqueProjection({
                left: -10 * aspect,
                right: 10 * aspect,
                bottom: -10,
                top: 10,
                near: 0.1,
                far: 1000,
            });
        }
        else {
            projection = new PerspectiveProjection({
                fov: MathUtils.degToRad(75),
                aspect,
                near: 0.1,
                far: 1000,
            });
        }
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
                this.config = { ...this.config, ...jsonConfig };
            }
            catch {
                console.warn("Using fallback configuration (No JSON found).");
            }
            this.canvas = document.getElementById(this.config.canvasId);
            if (!this.canvas) {
                // If not found, wait for DOMContentLoaded or a short timeout
                await new Promise((resolve) => {
                    if ("loading" === document.readyState) {
                        document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
                        // Fallback timeout in case DOMContentLoaded already fired or something else
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
            // Final check with a bit of a loop if it's still not there (e.g. dynamically added by another script)
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
                throw new Error(`[Application] Canvas element with ID '${this.config.canvasId}' not found in DOM.`);
            }
            if (this.config.fullscreen) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                window.addEventListener("resize", () => {
                    this.canvas.width = window.innerWidth;
                    this.canvas.height = window.innerHeight;
                    // Use clientWidth/Height to account for scrollbars or dev tools
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
            this.renderer = await RendererFactory.create(this.config.rendererType, this.canvas, this.config);
            this.renderer.setSize(this.canvas.width, this.canvas.height);
            // --- CRITICAL FIX: Ensure correct initial aspect ratio ---
            this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.camera.updateProjectionMatrix();
            await this.setupScene();
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
        // Update all registered controllers
        const inputMode = this.config.inputMode || "tank";
        for (let i = 0; i < this.controllers.length; i++) {
            const controller = this.controllers[i];
            // Dynamically inject inputMode if the controller supports it and it's not already set
            const ctrl = controller;
            if (ctrl._options && "inputMode" in ctrl._options) {
                ctrl._options.inputMode = ctrl._options.inputMode || inputMode;
            }
            controller.update(deltaTime);
        }
        this.update(deltaTime);
        this.scene.update();
        this.camera.update(this.camera.target, 0, 0, deltaTime);
        // Perform frustum culling before rendering
        FrustumCuller.cull(this.scene, this.camera.viewProjectionMatrix4);
        if (this.debug) {
            CollisionVisualizer.instance.update(this.scene);
            OctreeVisualizer.instance.update(this.scene, FrustumCuller.lastIntersectedNodes);
        }
        this.renderer.render(this.scene, this.camera.viewProjectionMatrix, this.camera.position, this.camera.viewMatrix);
        // Centralized reset of input deltas after each frame
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;
        Input.mouse.wheelX = 0;
        Input.mouse.wheelY = 0;
        Input.mouse.zoom = 0;
        requestAnimationFrame((time) => this._loop(time));
    }
}
//# sourceMappingURL=Application.js.map