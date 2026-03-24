/// src/core/SmallWorld.ts
import { ColorUtils, DEFAULT_RENDERER, RendererType } from "./index.js";
import { RendererInterface } from "../interfaces/index.js";
import { RendererFactory } from "../renderers/index.js";

/**
 * Global world configuration.
 */
export interface WorldConfig {
  /** The type of renderer to use. */
  rendererType?: RendererType | string;
  /** The ID of the canvas element. */
  canvasId: string;
  /** Whether debug mode is enabled. */
  debug?: boolean;
  /** The size of the world. */
  worldSize?: number;
  /** The background sky color. */
  skyColor?: string;
  /** Whether to show the HUD. */
  showHUD?: boolean;
}

/**
 * Main entry point for the SmallWorld engine.
 */
export class SmallWorld {
  /** The current world configuration. */
  public config!: WorldConfig;
  /** The currently active renderer. */
  public activeRenderer!: RendererInterface;

  /**
   * Creates a new SmallWorld instance.
   */
  constructor() {}

  /**
   * Initializes the engine with the given configuration file.
   * @param configPath Path to the configuration JSON file.
   */
  public async init(configPath: string): Promise<void> {
    try {
      const response: Response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`Konfigurationsdatei nicht gefunden: ${configPath}`);
      }
      this.config = await response.json();
      if (!this.config.rendererType) {
        this.config.rendererType = DEFAULT_RENDERER;
      }
      const canvas: HTMLCanvasElement | null = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
      if (!canvas) {
        throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
      }
      this.activeRenderer = await RendererFactory.create(this.config.rendererType, canvas);
      if (this.config.skyColor) {
        this.activeRenderer.setClearColor(ColorUtils.fromCSS(this.config.skyColor));
      } else {
        this.activeRenderer.setClearColor(ColorUtils.fromCSS("#111111"));
      }
    } catch (e: unknown) {
      console.error("[SmallWorld] Initialisierung fehlgeschlagen:", e);
      throw e;
    }
  }
}
