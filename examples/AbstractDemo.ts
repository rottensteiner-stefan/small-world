/// examples/AbstractDemo.ts

import { Application } from "../src/index.js";
import { EngineConfig } from "../src/interfaces/EngineConfig.js";

export abstract class AbstractDemo extends Application {
  // Der Konstruktor wird an Application weitergereicht.
  // Er kann von Demo 1-4 1:1 geerbt werden, ohne ihn dort neu zu schreiben!
  constructor(config: EngineConfig = {}) {
    super(config);
  }

  /**
   * Sammelt die wichtigsten Debug-Informationen der Engine.
   * Erbende Demos können diese Methode überschreiben (mit super.getDebugInfo()),
   * um demo-spezifische Daten hinzuzufügen.
   */
  protected getDebugInfo(): Record<string, string | number> {
    return {
      Renderer: this.renderer.type,
      "Cam Modus": this.camera.activeStrategyType,
      "Cam Pos X": this.camera.position.x.toFixed(2),
      "Cam Pos Y": this.camera.position.y.toFixed(2),
      "Cam Pos Z": this.camera.position.z.toFixed(2),
    };
  }

  /**
   * Hilfsmethode, um die Infos formatiert in die Konsole zu schreiben.
   * (Kannst du z.B. bei Tastendruck 'I' für Info aufrufen).
   */
  protected printDebug(): void {
    console.clear(); // Hält die Konsole sauber
    console.table(this.getDebugInfo());
  }
}
