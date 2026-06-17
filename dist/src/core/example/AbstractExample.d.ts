import { SmallWorld } from '../SmallWorld.js';
import { EngineConfig } from '../../interfaces/index.js';
export declare abstract class AbstractExample extends SmallWorld {
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
     * A hook method that is called when the canvas element is recreated.
     * By default, it binds the click event to request PointerLock. Inheriting classes can override this if needed.
     */
    protected onCanvasRecreated(): void;
    /**
     * Default update method for examples. Subclasses can override this to implement custom logic.
     * @param _deltaTime Time elapsed since the last frame.
     */
    protected update(_deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
    protected printDebug(): void;
}
