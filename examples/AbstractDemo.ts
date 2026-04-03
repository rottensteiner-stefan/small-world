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
   * Der Konstruktor wird an Application weitergereicht.
   * Registriert zudem den globalen Keyboard-Listener für Demos.
   */
  constructor(config: EngineConfig = {}) {
    super(config);
    window.addEventListener("keydown", (event: KeyboardEvent) => this.onKeyDown(event));
  }

  /**
   * Zentrale Tastatursteuerung für alle Demos.
   * Erbende Klassen können diese Methode überschreiben und super.onKeyDown(event) aufrufen.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (Input.isPressed(Keys.SHIFT_L)) {
      if (event.code === Keys.D1) {
        this.switchRenderer(RendererType.WEB_GL1);
      } else if (event.code === Keys.D2) {
        this.switchRenderer(RendererType.WEB_GL2);
      } else if (event.code === Keys.D3) {
        this.switchRenderer(RendererType.WEB_GPU);
      }
    }

    if (event.code === Keys.I) {
      this.printDebug();
    }
  }

  /**
   * Erlaubt den Wechsel des Renderers zur Laufzeit.
   * Stoppt die App, wechselt den Renderer und startet sie neu.
   */
  protected async switchRenderer(type: RendererType): Promise<void> {
    if (this.renderer.type === type) {
      console.log(`Current renderer is already ${type}.`);
      return;
    }

    console.log(`Switching renderer to ${type}...`);

    // 1. Stop the render loop
    this.stop();

    // 2. Cleanup old resources (wichtig für WebGL/WebGPU Limits)
    if (
      this.renderer &&
      "destroy" in this.renderer &&
      typeof this.renderer.destroy === "function"
    ) {
      try {
        this.renderer.destroy();
      } catch (e) {
        console.warn("Error while deconstruction current renderer: ", e);
      }
    }

    // HTML5 Canvas kann pro Lebenszyklus nur EINEN Kontext-Typ haben.
    // Wir MÜSSEN das Canvas-Element zerstören und ein komplett neues erstellen.
    const parent = this.canvas.parentNode;
    if (!parent) {
      console.error("Canvas hat keinen Parent. Kann nicht ausgetauscht werden.");
      return;
    }

    const className = this.canvas.className;
    const cssText = this.canvas.style.cssText;
    const h = this.canvas.height;
    const oldId = this.canvas.id;
    const w = this.canvas.width;

    // Remove and zero out the old canvas to help GC
    parent.removeChild(this.canvas);
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.canvas = null as unknown as HTMLCanvasElement;

    // Wait a moment so the browser can clear the DOM/memory.
    // This often solves the problem of "too many contexts" being active or gettingContext failing immediately.
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 3. Create brand-new Canvas
    const newCanvas = document.createElement("canvas");
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
    } catch (error) {
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
    // Standardmäßig leer
  }

  protected getDebugInfo(): Record<string, string | number> {
    return {
      Renderer: this.renderer ? this.renderer.type : "None",
      "Pointer Locked": Input.isPointerLocked ? "Ja" : "Nein",
      "Cam Modus": this.camera.activeStrategyType,
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
