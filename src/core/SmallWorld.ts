import { RendererFactory } from "../renderers/RendererFactory.js";
import { Input } from "./Input.js";
import { Color } from "./Color.js";
import { ColorUtils } from "./ColorUtils.js";

export interface EngineConfig {
  rendererType: string;
  canvasId: string;
  debug: boolean;
  worldSize: number;
  skyColor: Color; // Als Color Objekt
}

export class SmallWorld {
  private _renderer: any;
  private _config!: EngineConfig;

  public async init(path: string) {
    const response = await fetch(path);
    const loadedConfig = await response.json();

    this._config = {
      rendererType: loadedConfig.rendererType || "BEST",
      canvasId: loadedConfig.canvasId || "viewport",
      debug: loadedConfig.debug ?? true,
      worldSize: loadedConfig.worldSize || 100,
      skyColor: ColorUtils.fromCSS(loadedConfig.skyColor || "#000000"),
    };

    Input.debug = this._config.debug;

    RendererFactory.init();
    this._renderer = RendererFactory.create(this._config.rendererType);
    await this._renderer.initialize(document.getElementById(this._config.canvasId));

    // Himmel setzen
    this._renderer.setClearColor(this._config.skyColor);

    if (this._config.debug) {
      console.log("%c[SmallWorld] Celestial Update v0.8.27 ready", "color: #0ff");
    }
  }

  public get config(): EngineConfig {
    return this._config;
  }
  public get activeRenderer() {
    return this._renderer;
  }
}
