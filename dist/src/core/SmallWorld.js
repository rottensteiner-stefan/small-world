import { RendererType, DEFAULT_RENDERER } from '../core/Engine.js';
import { WebGPURenderer } from '../renderers/WebGPURenderer.js';
export class SmallWorld {
    config;
    activeRenderer; // Hier später dein Renderer-Interface nutzen
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
            // Initialisierung des gewählten Renderers
            this.activeRenderer = await this.setupRenderer(this.config.rendererType);
            if (this.config.debug) {
                console.log(`[SmallWorld] Engine initialisiert mit Renderer: ${this.config.rendererType}`);
            }
        }
        catch (e) {
            console.error("[SmallWorld] Kritischer Fehler bei der Initialisierung:", e);
            throw e;
        }
    }
    /**
     * Wählt und initialisiert den passenden Renderer
     */
    async setupRenderer(type) {
        const canvas = document.getElementById(this.config.canvasId);
        if (!canvas) {
            throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
        }
        // Logik für "BEST" Renderer oder spezifische Auswahl
        if (type === RendererType.BEST || type === RendererType.WEB_GPU) {
            try {
                const renderer = new WebGPURenderer(canvas);
                await renderer.init();
                return renderer;
            }
            catch (e) {
                if (type === RendererType.WEB_GPU) {
                    throw new Error("WebGPU wurde explizit verlangt, ist aber nicht verfügbar.");
                }
                console.warn("[SmallWorld] WebGPU fehlgeschlagen, weiche auf Fallback aus.");
            }
        }
        // Hier kämen später Fallbacks wie WebGL oder Canvas
        // return new WebGLRenderer(canvas);
        throw new Error(`Renderer-Typ ${type} konnte nicht initialisiert werden.`);
    }
}
//# sourceMappingURL=SmallWorld.js.map