/// src/core/Application.ts

import {AbstractProjection, ObliqueProjection, OrthographicProjection, PerspectiveProjection} from "../math/index.js";
import {Camera} from "./Camera.js";
import {CameraInterfaceData, EngineConfig} from "../interfaces/index.js";
import {Renderer} from "../interfaces/Renderer.js";
import {ProjectionType, RendererType} from "../enums/index.js";
import {RendererFactory} from "../renderers/index.js";
import {Scene} from "./Scene.js";
import {Input} from "./Input.js";

/**
 * Base class for applications built with the SmallWorld engine.
 */
export abstract class Application {
    /** The engine configuration. */
    public config: EngineConfig;
    /** The current scene. */
    public scene: Scene;
    /** The main camera. */
    public camera: CameraInterfaceData;
    /** The active renderer. */
    public renderer: Renderer;
    /** The canvas element. */
    public canvas!: HTMLCanvasElement;

    private _lastTime: number = 0;
    private _isRunning: boolean = false;
    private _isInitialized: boolean = false;

    /**
     * Creates a new application.
     * @param userConfig Optional configuration to override defaults.
     */
    constructor(userConfig: EngineConfig = {}) {
        this.config = {
            canvasId: "canvas",
            rendererType: RendererType.WEB_GPU,
            projection: ProjectionType.PERSPECTIVE,
            fullscreen: true,
            ...userConfig,
        };

        this.scene = new Scene();

        const aspect: number = window.innerWidth / window.innerHeight;
        let projection: AbstractProjection;

        if (ProjectionType.ORTHOGRAPHIC === this.config.projection) {
            projection = new OrthographicProjection({
                left: -10 * aspect,
                right: 10 * aspect,
                bottom: -10,
                top: 10,
                near: 0.1,
                far: 1000,
            });
        } else if (ProjectionType.OBLIQUE === this.config.projection) {
            projection = new ObliqueProjection({
                left: -10 * aspect,
                right: 10 * aspect,
                bottom: -10,
                top: 10,
                near: 0.1,
                far: 1000,
            });
        } else {
            projection = new PerspectiveProjection({
                fov: (75 * Math.PI) / 180,
                aspect,
                near: 0.1,
                far: 1000,
            });
        }

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
                const response: Response = await fetch("/config/small-world.json");
                if (response.ok) {
                    const jsonConfig: unknown = await response.json();
                    this.config = {...this.config, ...(jsonConfig as EngineConfig)};
                }
            } catch {
                console.warn("Nutze Fallback-Config (Keine JSON gefunden).");
            }

            this.canvas = document.getElementById(this.config.canvasId!) as HTMLCanvasElement;
            if (this.config.fullscreen) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                window.addEventListener("resize", () => {
                    this.canvas.width = window.innerWidth;
                    this.canvas.height = window.innerHeight;
                    this.camera.aspect = this.canvas.width / this.canvas.height;
                    this.camera.updateProjectionMatrix();
                    if (this.renderer) {
                        this.renderer.setSize(this.canvas.width, this.canvas.height);
                    }
                });
            } else if (this.config.width && this.config.height) {
                this.canvas.width = this.config.width;
                this.canvas.height = this.config.height;
            }

            this.renderer = await RendererFactory.create(
                this.config.rendererType!,
                this.canvas,
                this.config,
            );

            await this.setupScene();
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

        const deltaTime: number = (currentTime - this._lastTime) / 1000.0;
        this._lastTime = currentTime;

        this.update(deltaTime);

        this.scene.update();
        this.camera.update(this.camera.target, 0, 0, deltaTime);
        this.camera.updateViewMatrix();

        this.renderer.render(this.scene, this.camera.viewProjectionMatrix, this.camera.position);

        requestAnimationFrame((time: number) => this._loop(time));
    }
}
