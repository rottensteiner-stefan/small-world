import { Camera } from './Camera.js';
import { Scene } from './Scene.js';
import { InteractionManager } from './InteractionManager.js';
import { EventDispatcherImpl } from './events/EventDispatcherImpl.js';
import { EngineOptions, Renderer } from '../interfaces/index.js';
import { GadgetInspector } from '../tools/GadgetInspector.js';
import { PhysicsSystem } from '../physix/PhysicsSystem.js';
/** The current engine version. */
export declare const ENGINE_VERSION = "0.69.2";
/**
 * Base class for applications built with the SmallWorld engine.
 */
export declare abstract class SmallWorld {
    /** The engine configuration. */
    config: EngineOptions;
    /** The current scene. */
    scene: Scene;
    /** The main camera. */
    camera: Camera;
    /** The active renderer. */
    renderer: Renderer;
    /** The built-in physics system. Stepped automatically each frame when `config.enablePhysics` is true. */
    physics: PhysicsSystem;
    /** The interaction manager for gamification / picking. */
    interactionManager: InteractionManager;
    forge: import('../tools/forge/Forge.js').Forge;
    /** The canvas element. */
    canvas: HTMLCanvasElement;
    /** Whether debug visualization is enabled. */
    debug: boolean;
    /** The global event bus for this engine instance. */
    events: EventDispatcherImpl;
    private _inspector?;
    private _lastTime;
    private _isRunning;
    private _isInitialized;
    private _userConfig;
    /**
     * Creates a new SmallWorld application.
     * @param userConfig Optional configuration to override defaults.
     */
    protected constructor(userConfig?: EngineOptions);
    /**
     * Called to setup the scene after the engine is initialized.
     */
    protected abstract setupScene(): Promise<void>;
    /**
     * Called once after the GadgetInspector is created.
     * Override in subclasses to register scene-specific inspector controls.
     * @param _inspector The newly created inspector instance.
     */
    protected onInspectorReady(_inspector: GadgetInspector): void;
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
     * Destroys the engine instance, freeing memory and removing all global event listeners.
     */
    destroy(): void;
    private _onPageHide;
    private _onResize;
    private _onKeyDown;
    /**
     * The main application loop.
     * @param currentTime The current timestamp.
     */
    private _loop;
}
