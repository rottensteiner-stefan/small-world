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
            if (event.code === Keys.D1) {
                this.switchRenderer(RendererType.WEB_GL1);
            } else if (event.code === Keys.D2) {
                this.switchRenderer(RendererType.WEB_GL2);
            } else if (event.code === Keys.D3) {
                this.switchRenderer(RendererType.WEB_GPU);
            }
        }

        if (event.code === Keys.I) {
            this.printDebug();
        }
    }

    /**
     * Erlaubt den Wechsel des Renderers zur Laufzeit.
     * Stoppt die App, wechselt den Renderer und startet sie neu.
     */
    protected async switchRenderer(type: RendererType): Promise<void> {
        if (this.renderer.type === type) {
            console.log(`Renderer ist bereits ${type}.`);
            return;
        }

        console.log(`Switching renderer to ${type}...`);

        // 1. Stop the render loop
        this.stop();

        // 2. Cleanup old resources (wichtig für WebGL/WebGPU Limits)
        if (this.renderer && typeof (this.renderer as any).destroy === 'function') {
            try {
                (this.renderer as any).destroy();
            } catch (e) {
                console.warn("Fehler beim Zerstören des alten Renderers:", e);
            }
        }

        // HTML5 Canvas kann pro Lebenszyklus nur EINEN Kontext-Typ haben.
        // Wir MÜSSEN das Canvas-Element zerstören und ein komplett neues erstellen.
        const parent = this.canvas.parentNode;
        if (!parent) {
            console.error("Canvas hat keinen Parent. Kann nicht ausgetauscht werden.");
            return;
        }

        const oldId = this.canvas.id;
        const cssText = this.canvas.style.cssText;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Altes Canvas entfernen und nullen, um GC zu helfen
        parent.removeChild(this.canvas);
        this.canvas.width = 0;
        this.canvas.height = 0;
        (this.canvas as any) = null;

        // WICHTIG: Einen Tick warten, damit der Browser den DOM/Speicher aufräumen kann.
        // Das löst oft das Problem, dass "zuviele Kontexte" aktiv sind oder getContext sofort fehlschlägt.
        await new Promise(resolve => setTimeout(resolve, 50));

        // 3. Create brand new Canvas
        const newCanvas = document.createElement("canvas");
        newCanvas.id = oldId;
        newCanvas.width = w || window.innerWidth;
        newCanvas.height = h || window.innerHeight;
        newCanvas.style.cssText = cssText;
        
        parent.appendChild(newCanvas);
        this.canvas = newCanvas;
        
        console.log("Neues, unbeflecktes Canvas in den DOM eingefügt.");

        // Wenn erbende Demos Events auf das Canvas gebunden haben, müssen diese neu gebunden werden.
        this.onCanvasRecreated();

        // 4. Create the new renderer
        try {
            this.config.rendererType = type;
            this.renderer = await RendererFactory.create(type, this.canvas, this.config);
            this.renderer.setSize(this.canvas.width, this.canvas.height);
            console.log(`Successfully switched to ${type}.`);
        } catch (error) {
            console.error(`Failed to switch to renderer ${type}:`, error);
        }

        // 5. Restart the render loop
        this.start();
    }

    /**
     * Hook-Methode, die aufgerufen wird, wenn das Canvas-Element neu erstellt wurde.
     * Erbende Klassen (wie Demo6) MÜSSEN diese überschreiben, um z.B. Klick-Events für den PointerLock neu zu binden.
     */
    protected onCanvasRecreated(): void {
        // Standardmäßig leer
    }

    /**
     * Sammelt die wichtigsten Debug-Informationen der Engine.
     */
    protected getDebugInfo(): Record<string, string | number> {
        return {
            Renderer: this.renderer ? this.renderer.type : "None",
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
