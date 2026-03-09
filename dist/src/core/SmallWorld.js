import { DEFAULT_RENDERER } from "./Engine.js";
import { RendererFactory } from "../renderers/RendererFactory.js";
import { ColorUtils } from "./colors/ColorUtils.js";
export class SmallWorld {
    config;
    activeRenderer;
    constructor() {
    }
    async init(configPath) {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Konfigurationsdatei nicht gefunden: ${configPath}`);
            }
            this.config = await response.json();
            if (!this.config.rendererType) {
                this.config.rendererType = DEFAULT_RENDERER;
            }
            const canvas = document.getElementById(this.config.canvasId);
            if (!canvas) {
                throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
            }
            this.activeRenderer = await RendererFactory.create(this.config.rendererType, canvas);
            if (this.config.skyColor) {
                this.activeRenderer.setClearColor(ColorUtils.fromCSS(this.config.skyColor));
            }
            else {
                this.activeRenderer.setClearColor(ColorUtils.fromCSS("#111111"));
            }
        }
        catch (e) {
            console.error("[SmallWorld] Initialisierung fehlgeschlagen:", e);
            throw e;
        }
    }
}
//# sourceMappingURL=SmallWorld.js.map