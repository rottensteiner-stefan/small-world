import { DEFAULT_RENDERER, RendererType } from "./Engine.js";
import { RendererFactory } from "../renderers/RendererFactory.js";
import { IRenderer } from "../interfaces/IRenderer.js";
import { ColorUtils } from "./colors/ColorUtils.js";

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
      if (!response.ok) throw new Error(`Konfigurationsdatei nicht gefunden: ${configPath}`);
      this.config = await response.json();
      if (!this.config.rendererType) {
        this.config.rendererType = DEFAULT_RENDERER;
      }
      const canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
      if (!canvas)
        throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
      this.activeRenderer = await RendererFactory.create(this.config.rendererType, canvas);
      if (this.config.skyColor) {
        this.activeRenderer.setClearColor(ColorUtils.fromCSS(this.config.skyColor));
      } else {
        this.activeRenderer.setClearColor(ColorUtils.fromCSS("#111111"));
      }
    } catch (e) {
      throw e;
    }
  }
}
