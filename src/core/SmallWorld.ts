import { DEFAULT_RENDERER, RendererType } from "./Engine.js";
import { RendererFactory } from "../renderers/RendererFactory.js";
import { IRenderer } from "../interfaces/IRenderer.js";
import { ColorUtils } from "./ColorUtils.js"; // WICHTIG: Für die Farbkonvertierung

export interface WorldConfig {
  rendererType?: RendererType | string;
  canvasId: string;
  debug?: boolean;
  worldSize?: number;
  skyColor?: string;
  showHUD?: boolean;
}

export class SmallWorld {
  public config!: WorldConfig;
  public activeRenderer!: IRenderer;

  constructor() {}

  public async init(configPath: string): Promise<void> {
    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`Konfigurationsdatei nicht gefunden: ${configPath}`);
      }

      this.config = await response.json();

      if (!this.config.rendererType) {
        console.warn(
          `[SmallWorld] Kein rendererType in Config gefunden. Nutze Default: ${DEFAULT_RENDERER}`,
        );
        this.config.rendererType = DEFAULT_RENDERER;
      }

      const canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
      if (!canvas) {
        throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
      }

      // Factory erstellt den Renderer
      this.activeRenderer = await RendererFactory.create(this.config.rendererType, canvas);

      // --- NEU: SkyColor setzen ---
      if (this.config.skyColor) {
        const skyColor = ColorUtils.fromCSS(this.config.skyColor);
        this.activeRenderer.setClearColor(skyColor);
      } else {
        // Optionaler Fallback, falls in der JSON nichts steht
        this.activeRenderer.setClearColor(ColorUtils.fromCSS("#111111"));
      }
      // ----------------------------

      if (this.config.debug) {
        console.log(`[SmallWorld] Engine initialisiert mit Renderer: ${this.config.rendererType}`);
      }
    } catch (e) {
      console.error("[SmallWorld] Kritischer Fehler bei der Initialisierung:", e);
      throw e;
    }
  }
}
