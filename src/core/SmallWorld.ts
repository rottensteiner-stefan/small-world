/// src/core/SmallWorld.ts

import { DEFAULT_RENDERER } from "./index.js";
import { ConfigLoader } from "./ConfigLoader.js";
import { ColorUtils } from "../utils/index.js";
import { Renderer, EngineConfig } from "../interfaces/index.js";
import { RendererFactory } from "../renderers/index.js";

/**
 * Global world configuration.
 */
export interface WorldConfig extends EngineConfig {
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
  public activeRenderer!: Renderer;

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
      this.config = (await ConfigLoader.load(configPath)) as WorldConfig;
      if (!this.config.rendererType) {
        this.config.rendererType = DEFAULT_RENDERER;
      }

      const canvasId = this.config.canvasId || "SmallWorld";
      const canvas: HTMLCanvasElement | undefined =
        (document.getElementById(canvasId) as HTMLCanvasElement) ?? undefined;

      if (undefined === canvas) {
        throw new Error(`Canvas mit ID '${canvasId}' wurde nicht im DOM gefunden.`);
      }
      this.activeRenderer = await RendererFactory.create(
        this.config.rendererType!,
        canvas,
        this.config,
      );
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
