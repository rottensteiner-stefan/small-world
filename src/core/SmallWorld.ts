/// src/core/SmallWorld.ts
import { ColorUtils, DEFAULT_RENDERER, RendererType } from "./index.js";
import { RendererInterface } from "../interfaces/index.js";
import { RendererFactory } from "../renderers/index.js";

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
  public activeRenderer!: RendererInterface;

  constructor() {}

  public async init(configPath: string): Promise<void> {
    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`Konfigurationsdatei nicht gefunden: ${configPath}`);
      }
      this.config = await response.json();
      if (!this.config.rendererType) {
        this.config.rendererType = DEFAULT_RENDERER;
      }
      const canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
      if (!canvas) {
        throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
      }
      this.activeRenderer = await RendererFactory.create(this.config.rendererType, canvas);
      if (this.config.skyColor) {
        this.activeRenderer.setClearColor(ColorUtils.fromCSS(this.config.skyColor));
      } else {
        this.activeRenderer.setClearColor(ColorUtils.fromCSS("#111111"));
      }
    } catch (e) {
      console.error("[SmallWorld] Initialisierung fehlgeschlagen:", e);

      throw e;
    }
  }
}
