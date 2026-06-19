/// src/core/example/AbstractExample.ts
import { SmallWorld } from "../SmallWorld.js";
import { Input } from "../Input.js";
import { Keys } from "../../enums/Keys.js";
import { AssetManager } from "../../loaders/index.js";
export class AbstractExample extends SmallWorld {
    /**
     * The constructor is passed to Application.
     * Also registers the global keyboard listener for demos.
     */
    constructor(config = {}) {
        super(config);
        window.addEventListener("keydown", (event) => this.onKeyDown(event));
    }
    /**
     * Helper to wait for all currently loading assets to finish.
     * Useful to call at the end of setupScene.
     */
    async waitForAssets() {
        if (!AssetManager.isLoaded) {
            console.log(`Waiting for assets... (${(AssetManager.getGlobalProgress() * 100).toFixed(0)}%)`);
            await AssetManager.onLoaded();
            console.log("All assets loaded.");
        }
    }
    /**
     * Central keyboard control for all demos.
     * Inheriting classes can override this method and call super.onKeyDown(event).
     */
    onKeyDown(event) {
        if (Keys.B === event.code) {
            this.debug = !this.debug;
            console.log(`Debug visualization: ${this.debug ? "ON" : "OFF"}`);
        }
    }
    /**
     * A hook method that is called when the canvas element is recreated.
     * By default, it binds the click event to request PointerLock. Inheriting classes can override this if needed.
     */
    onCanvasRecreated() {
        this.canvas.addEventListener("click", (event) => {
            // Wenn SHIFT gedrückt ist, ignorieren wir den PointerLock (damit der Inspector arbeiten kann)
            if (event.shiftKey)
                return;
            if (!Input.isPointerLocked) {
                Input.requestPointerLock(this.canvas);
            }
        });
    }
    /**
     * Default update method for examples. Subclasses can override this to implement custom logic.
     * @param _deltaTime Time elapsed since the last frame.
     */
    update(_deltaTime) {
        // Default implementation does nothing
    }
}
//# sourceMappingURL=AbstractExample.js.map