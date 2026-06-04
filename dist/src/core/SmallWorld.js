/// src/core/SmallWorld.ts
import { DEFAULT_RENDERER } from "./index.js";
import { ConfigLoader } from "./ConfigLoader.js";
import { ColorUtils } from "../utils/index.js";
import { RendererFactory } from "../renderers/index.js";
/**
 * Main entry point for the SmallWorld engine.
 */
export class SmallWorld {
    /** The current world configuration. */
    config;
    /** The currently active renderer. */
    activeRenderer;
    /**
     * Creates a new SmallWorld instance.
     */
    constructor() { }
    /**
     * Initializes the engine with the given configuration file.
     * @param configPath Path to the configuration JSON file.
     */
    async init(configPath) {
        try {
            this.config = (await ConfigLoader.load(configPath));
            if (!this.config.rendererType) {
                this.config.rendererType = DEFAULT_RENDERER;
            }
            const canvasId = this.config.canvasId || "SmallWorld";
            const canvas = document.getElementById(canvasId) ?? undefined;
            if (undefined === canvas) {
                throw new Error(`Canvas mit ID '${canvasId}' wurde nicht im DOM gefunden.`);
            }
            this.activeRenderer = await RendererFactory.create(this.config.rendererType, canvas, this.config);
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