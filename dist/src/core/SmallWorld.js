import { RendererFactory } from '../renderers/RendererFactory.js';
import { Input } from './Input.js';
export class SmallWorld {
    _renderer;
    _config;
    async init(path) {
        const response = await fetch(path);
        const loadedConfig = await response.json();
        // Default-Werte setzen, falls in JSON nicht vorhanden
        this._config = {
            rendererType: loadedConfig.rendererType || "BEST",
            canvasId: loadedConfig.canvasId || "viewport",
            debug: loadedConfig.debug ?? true,
            worldSize: loadedConfig.worldSize || 100
        };
        Input.debug = this._config.debug;
        RendererFactory.init();
        this._renderer = RendererFactory.create(this._config.rendererType);
        await this._renderer.initialize(document.getElementById(this._config.canvasId));
        if (this._config.debug) {
            console.log("%c[SmallWorld] Config Loaded:", "color: #0f0; font-weight: bold", this._config);
        }
    }
    get config() {
        return this._config;
    }
    get activeRenderer() {
        return this._renderer;
    }
}
//# sourceMappingURL=SmallWorld.js.map