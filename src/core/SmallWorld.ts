import { RendererFactory } from "../renderers/RendererFactory.js";
import { Input } from "./Input.js";
import { ColorUtils } from "./ColorUtils.js";
import { Color } from "./Color.js";

export interface EngineConfig {
  rendererType: string;
  canvasId: string;
  debug: boolean;
  worldSize: number;
  skyColor: Color;
  showHUD: boolean;
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
      showHUD: loadedConfig.showHUD ?? false,
    };

    Input.debug = this._config.debug;

    RendererFactory.init();
    this._renderer = RendererFactory.create(this._config.rendererType);
    await this._renderer.initialize(document.getElementById(this._config.canvasId));
    this._renderer.setClearColor(this._config.skyColor);
  }

  public get config(): EngineConfig {
    return this._config;
  }
  public get activeRenderer() {
    return this._renderer;
  }
}
