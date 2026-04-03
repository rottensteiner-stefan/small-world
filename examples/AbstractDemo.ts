/// examples/AbstractDemo.ts

import {
  Application,
  EngineConfig,
  Input,
  Keys,
  RendererFactory,
  RendererType,
} from "../src/index.js";

export abstract class AbstractDemo extends Application {
  /**
   * The constructor is passed to Application.
   * Also registers the global keyboard listener for demos.
   */
  constructor(config: EngineConfig = {}) {
    super(config);
    window.addEventListener("keydown", (event: KeyboardEvent): void => this.onKeyDown(event));
  }

  /**
   * Central keyboard control for all demos.
   * Inheriting classes can override this method and call super.onKeyDown(event).
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (Input.isPressed(Keys.SHIFT_L)) {
      if (Keys.D1 === event.code) {
        this.switchRenderer(RendererType.WEB_GL1);
      } else if (Keys.D2 === event.code) {
        this.switchRenderer(RendererType.WEB_GL2);
      } else if (Keys.D3 === event.code) {
        this.switchRenderer(RendererType.WEB_GPU);
      }
    }

    if (Keys.I === event.code) {
      this.printDebug();
    }
  }

  /**
   * Allows switching the renderer at runtime.
   * Stops the app, switches the renderer, and restarts it.
   */
  protected async switchRenderer(type: RendererType): Promise<void> {
    if (type === this.renderer.type) {
      console.log(`Current renderer is already ${type}.`);
      return;
    }

    console.log(`Switching renderer to ${type}...`);

    // 1. Stop the render loop
    this.stop();

    // 2. Cleanup old resources (important for WebGL/WebGPU limits)
    if (
      this.renderer &&
      "destroy" in this.renderer &&
      "function" === typeof this.renderer.destroy
    ) {
      try {
        this.renderer.destroy();
      } catch (e: unknown) {
        console.warn("Error while deconstruction current renderer: ", e);
      }
    }

    // HTML5 Canvas can only have ONE context type per lifecycle.
    // We MUST destroy the canvas element and create a completely new one.
    const parent: HTMLElement | null = this.canvas.parentNode as HTMLElement;
    if (!parent) {
      console.error("Canvas has no parent. Cannot be replaced.");
      return;
    }

    const className: string = this.canvas.className;
    const cssText: string = this.canvas.style.cssText;
    const h: number = this.canvas.height;
    const oldId: string = this.canvas.id;
    const w: number = this.canvas.width;

    // Remove and zero out the old canvas to help GC
    parent.removeChild(this.canvas);
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.canvas = undefined as unknown as HTMLCanvasElement;

    // Wait a moment so the browser can clear the DOM/memory.
    // This often solves the problem of "too many contexts" being active or gettingContext failing immediately.
    await new Promise((resolve: (value: unknown) => void): number =>
      window.setTimeout(resolve, 50),
    );

    // 3. Create brand-new Canvas
    const newCanvas: HTMLCanvasElement = document.createElement("canvas");
    newCanvas.id = oldId;
    newCanvas.width = w || window.innerWidth;
    newCanvas.height = h || window.innerHeight;
    newCanvas.style.cssText = cssText;
    newCanvas.className = className;

    parent.appendChild(newCanvas);
    this.canvas = newCanvas;
    console.log("Re-created canvas");

    // If inheriting demos have bound events to the canvas, these must be rebound.
    this.onCanvasRecreated();

    // 4. Create the new renderer
    try {
      this.config.rendererType = type;
      this.renderer = await RendererFactory.create(type, this.canvas, this.config);
      this.renderer.setSize(this.canvas.width, this.canvas.height);
      console.log(`Successfully switched to ${type}.`);
    } catch (error: unknown) {
      console.error(`Failed to switch to renderer ${type}:`, error);
    }

    // 5. Restart the render loop
    this.start();
  }

  /**
   * A hook method that is called when the canvas element is recreated.
   * Inheriting classes (like Demo6) MUST override this to, for example, rebind click events for the PointerLock.
   */
  protected onCanvasRecreated(): void {
    // Empty by default
  }

  protected getDebugInfo(): Record<string, string | number> {
    return {
      Renderer: this.renderer ? this.renderer.type : "None",
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
