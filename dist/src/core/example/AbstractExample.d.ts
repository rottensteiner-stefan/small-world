import { Application, EngineConfig, RendererType } from '../../index.js';
export declare abstract class AbstractExample extends Application {
    /**
     * The constructor is passed to Application.
     * Also registers the global keyboard listener for demos.
     */
    constructor(config?: EngineConfig);
    /**
     * Helper to wait for all currently loading assets to finish.
     * Useful to call at the end of setupScene.
     */
    protected waitForAssets(): Promise<void>;
    /**
     * Central keyboard control for all demos.
     * Inheriting classes can override this method and call super.onKeyDown(event).
     */
    protected onKeyDown(event: KeyboardEvent): void;
    /**
     * Allows switching the renderer at runtime.
     * Stops the app, switches the renderer, and restarts it.
     */
    protected switchRenderer(type: RendererType): Promise<void>;
    /**
     * A hook method that is called when the canvas element is recreated.
     * By default, it binds the click event to request PointerLock. Inheriting classes can override this if needed.
     */
    protected onCanvasRecreated(): void;
    protected getDebugInfo(): Record<string, string | number>;
    protected printDebug(): void;
}
