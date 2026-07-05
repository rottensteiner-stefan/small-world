/// src/core/showcase/AbstractShowcase.ts

import { SmallWorld } from "../SmallWorld.js";
import { Input } from "../Input.js";
import { EngineOptions } from "../../interfaces/index.js";
import { Keys } from "../../enums/Keys.js";
import { AssetManager } from "../../loaders/index.js";

export abstract class AbstractShowcase extends SmallWorld {
  /**
   * The constructor is passed to Application.
   * Also registers the global keyboard listener for showcases.
   */
  constructor(config: EngineOptions = {}) {
    super(config);
    window.addEventListener("keydown", (event: KeyboardEvent): void => this.onKeyDown(event));
  }

  /**
   * Helper to wait for all currently loading assets to finish.
   * Useful to call at the end of setupScene.
   */
  protected async waitForAssets(): Promise<void> {
    if (!AssetManager.isLoaded) {
      console.log(
        `Waiting for assets... (${(AssetManager.getGlobalProgress() * 100).toFixed(0)}%)`,
      );
      await AssetManager.onLoaded();
      console.log("All assets loaded.");
    }
  }

  /**
   * Central keyboard control for all showcasess.
   * Inheriting classes can override this method and call super.onKeyDown(event).
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (Keys.B === event.code) {
      this.debug = !this.debug;
      console.log(`Debug visualization: ${this.debug ? "ON" : "OFF"}`);
    }
  }

  /**
   * A hook method that is called when the canvas element is recreated.
   * By default, it binds the click event to request PointerLock. Inheriting classes can override this if needed.
   */
  protected onCanvasRecreated(): void {
    this.canvas.addEventListener("click", (event: MouseEvent): void => {
      // Wenn SHIFT gedrückt ist, ignorieren wir den PointerLock (damit der Inspector arbeiten kann)
      if (event.shiftKey) return;

      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });
  }

  /**
   * Default update method for examples. Subclasses can override this to implement custom logic.
   * @param _deltaTime Time elapsed since the last frame.
   */
  protected update(_deltaTime: number): void {
    // Default implementation does nothing
  }
}
