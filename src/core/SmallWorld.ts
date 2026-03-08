import { DEFAULT_RENDERER } from "./Engine.js";
import { RendererFactory } from "../renderers/RendererFactory.js";
import { IRenderer } from "../interfaces/IRenderer.js";
import { RendererType } from "../enums/RendererType";

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

  /**
   * Initialisiert die Engine durch Laden der Konfigurationsdatei
   * @param configPath Pfad zur JSON-Konfiguration
   */
  public async init(configPath: string): Promise<void> {
    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`Konfigurationsdatei nicht gefunden: ${configPath}`);
      }

      this.config = await response.json();

      // --- Robustheits-Check für den Renderer ---
      if (!this.config.rendererType) {
        console.warn(
          `[SmallWorld] Kein rendererType in Config gefunden. Nutze Default: ${DEFAULT_RENDERER}`,
        );
        this.config.rendererType = DEFAULT_RENDERER;
      }

      // Canvas aus dem DOM holen
      const canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
      if (!canvas) {
        throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
      }

      // --- Factory übernimmt die komplette Arbeit ---
      this.activeRenderer = await RendererFactory.create(this.config.rendererType, canvas);

      if (this.config.debug) {
        console.log(`[SmallWorld] Engine initialisiert mit Renderer: ${this.config.rendererType}`);
      }
    } catch (e) {
      console.error("[SmallWorld] Kritischer Fehler bei der Initialisierung:", e);
      throw e;
    }
  }
}
