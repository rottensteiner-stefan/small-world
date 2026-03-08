import { DEFAULT_RENDERER } from "./Engine.js";
import { RendererFactory } from "../renderers/RendererFactory.js";
export class SmallWorld {
    config;
    activeRenderer;
    constructor() { }
    /**
     * Initialisiert die Engine durch Laden der Konfigurationsdatei
     * @param configPath Pfad zur JSON-Konfiguration
     */
    async init(configPath) {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Konfigurationsdatei nicht gefunden: ${configPath}`);
            }
            this.config = await response.json();
            // --- Robustheits-Check für den Renderer ---
            if (!this.config.rendererType) {
                console.warn(`[SmallWorld] Kein rendererType in Config gefunden. Nutze Default: ${DEFAULT_RENDERER}`);
                this.config.rendererType = DEFAULT_RENDERER;
            }
            // Canvas aus dem DOM holen
            const canvas = document.getElementById(this.config.canvasId);
            if (!canvas) {
                throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
            }
            // --- Factory übernimmt die komplette Arbeit ---
            this.activeRenderer = await RendererFactory.create(this.config.rendererType, canvas);
            if (this.config.debug) {
                console.log(`[SmallWorld] Engine initialisiert mit Renderer: ${this.config.rendererType}`);
            }
        }
        catch (e) {
            console.error("[SmallWorld] Kritischer Fehler bei der Initialisierung:", e);
            throw e;
        }
    }
}
//# sourceMappingURL=SmallWorld.js.map