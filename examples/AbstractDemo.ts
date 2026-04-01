/// examples/AbstractDemo.ts

import {Application, EngineConfig, Input, Keys, RendererFactory, RendererType} from "../src/index.js";

export abstract class AbstractDemo extends Application {
    /**
     * Der Konstruktor wird an Application weitergereicht.
     * Registriert zudem den globalen Keyboard-Listener für Demos.
     */
    constructor(config: EngineConfig = {}) {
        super(config);
        window.addEventListener("keydown", (event: KeyboardEvent) => this.onKeyDown(event));
    }

    /**
     * Zentrale Tastatursteuerung für alle Demos.
     * Erbende Klassen können diese Methode überschreiben und super.onKeyDown(event) aufrufen.
     */
    protected onKeyDown(event: KeyboardEvent): void {
        if (Input.isPressed(Keys.SHIFT_L)) {
            // SHIFT-LEFT + 1: WebGL 1
            if (Keys.D1 === event.code) {
                this.switchRenderer(RendererType.WEB_GL1);
                return;
            }
            // SHIFT-LEFT + 2: WebGL 2
            if (Keys.D2 === event.code) {
                this.switchRenderer(RendererType.WEB_GL2);
                return;
            }
            // SHIFT-LEFT + 3: WebGPU
            if (Keys.D3 === event.code) {
                this.switchRenderer(RendererType.WEB_GPU);
                return;
            }
        }

        // Beispiel: 'I' für Debug-Info
        if (Keys.I === event.code) {
            this.printDebug();
        }
    }

    /**
     * Erlaubt den Wechsel des Renderers zur Laufzeit.
     */
    protected async switchRenderer(type: RendererType): Promise<void> {
        if (this.renderer.type === type) {
            return;
        }

        console.log(`Switching renderer to ${type}...`);
        this.renderer = await RendererFactory.create(type, this.canvas, this.config);
        this.config.renderer = type;
    }

    /**
     * Sammelt die wichtigsten Debug-Informationen der Engine.
     * Erbende Demos können diese Methode überschreiben (mit super.getDebugInfo()),
     * um demo-spezifische Daten hinzuzufügen.
     */
    protected getDebugInfo(): Record<string, string | number> {
        return {
            Renderer: this.renderer.type,
            "Cam Modus": this.camera.activeStrategyType,
            "Cam Pos X": this.camera.position.x.toFixed(2),
            "Cam Pos Y": this.camera.position.y.toFixed(2),
            "Cam Pos Z": this.camera.position.z.toFixed(2),
        };
    }

    /**
     * Hilfsmethode, um die Infos formatiert in die Konsole zu schreiben.
     */
    protected printDebug(): void {
        console.clear();
        console.table(this.getDebugInfo());
    }
}
