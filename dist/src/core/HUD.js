import { ENGINE_VERSION } from "./Engine.js";
export class HUD {
    enabled;
    root = null;
    // Hier speichern wir die Referenzen zu den HTML-Elementen für schnellen Zugriff
    elements = new Map();
    constructor(enabled) {
        this.enabled = enabled;
    }
    async init() {
        if (!this.enabled)
            return;
        try {
            const response = await fetch("./resources/templates/hud.html");
            let html = await response.text();
            html = html.replace(/{sm-engine-version}/g, `v${ENGINE_VERSION}`);
            const container = document.createElement("div");
            container.innerHTML = html;
            document.body.appendChild(container);
            this.root = document.getElementById("sw-hud-root");
            // --- NEU: Data-Binding initialisieren ---
            // Finde ALLE Elemente, die das Attribut 'data-hud' haben
            const nodes = document.querySelectorAll("[data-hud]");
            nodes.forEach((node) => {
                const key = node.getAttribute("data-hud");
                if (key) {
                    this.elements.set(key, node);
                }
            });
        }
        catch (e) {
            console.error("[HUD] Failed to load template:", e);
        }
    }
    setVisible(visible) {
        if (this.root) {
            this.root.style.display = visible ? "block" : "none";
        }
    }
    /**
     * Nimmt ein Key-Value Objekt entgegen und aktualisiert nur die gemappten Elemente.
     * Beispiel: hud.update({ "hud.fps": 120, "hud.cam.type": "SMOOTH" });
     */
    update(data) {
        if (!this.enabled || !this.root || this.root.style.display === "none")
            return;
        // Iteriere über alle übergebenen Keys
        for (const key in data) {
            const el = this.elements.get(key);
            if (el) {
                // Nur updaten, wenn der Wert sich auch im HTML-Element befindet
                el.textContent = data[key].toString();
            }
        }
    }
}
//# sourceMappingURL=HUD.js.map