import { CameraInterfaceData, EngineConfig } from '../interfaces/index.js';
import { Renderer } from '../interfaces/Renderer.js';
import { Scene } from './Scene.js';
/**
 * Base class for applications built with the SmallWorld engine.
 */
export declare abstract class Application {
    /** The engine configuration. */
    config: EngineConfig;
    /** The current scene. */
    scene: Scene;
    /** The main camera. */
    camera: CameraInterfaceData;
    /** The active renderer. */
    renderer: Renderer;
    /** The canvas element. */
    canvas: HTMLCanvasElement;
    private _lastTime;
    private _isRunning;
    private _isInitialized;
    /**
     * Creates a new application.
     * @param userConfig Optional configuration to override defaults.
     */
    protected constructor(userConfig?: EngineConfig);
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
    start(): Promise<void>;
    /**
     * Stops the application loop.
     */
    stop(): void;
    /**
     * The main application loop.
     * @param currentTime The current timestamp.
     */
    private _loop;
}
