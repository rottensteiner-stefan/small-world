/// src/core/example/AbstractExample.ts

import { Application, EngineConfig, Input, Keys } from "../../index.js";
import { AssetManager } from "../../loaders/index.js";

export abstract class AbstractExample extends Application {
  /**
   * The constructor is passed to Application.
   * Also registers the global keyboard listener for demos.
   */
  constructor(config: EngineConfig = {}) {
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
   * Central keyboard control for all demos.
   * Inheriting classes can override this method and call super.onKeyDown(event).
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (Keys.I === event.code) {
      this.printDebug();
    }
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
    this.canvas.addEventListener("click", (): void => {
      if (false === Input.isPointerLocked) {
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

  protected getDebugInfo(): Record<string, string | number> {
    return {
      Renderer: this.renderer ? this.renderer.type : "None",
      "Assets Loaded": AssetManager.isLoaded
        ? "Yes"
        : `${(AssetManager.getGlobalProgress() * 100).toFixed(0)}%`,
      "Pointer Locked": Input.isPointerLocked ? "Yes" : "No",
      "Cam Mode": this.camera.activeStrategyType,
      "Cam Pos X": this.camera.position.x.toFixed(2),
      "Cam Pos Y": this.camera.position.y.toFixed(2),
      "Cam Pos Z": this.camera.position.z.toFixed(2),
    };
  }

  protected printDebug(): void {
    console.clear();
    console.table(this.getDebugInfo());
  }
}
