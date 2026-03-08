import { ENGINE_VERSION } from './Engine.js';
export class HUD {
    enabled;
    root = null;
    fpsEl = null;
    camEl = null;
    posXEl = null;
    posYEl = null;
    posZEl = null;
    scoreEl = null;
    constructor(enabled) {
        this.enabled = enabled;
    }
    async init() {
        if (!this.enabled)
            return;
        try {
            // --- NEUER PFAD HIER ---
            const response = await fetch("./resources/templates/hud.html");
            let html = await response.text();
            // Platzhalter ersetzen
            html = html.replace(/{sm-engine-version}/g, `v${ENGINE_VERSION}`);
            const container = document.createElement("div");
            container.innerHTML = html;
            document.body.appendChild(container);
            // IDs aus dem Template holen
            this.root = document.getElementById("sw-hud-root");
            this.fpsEl = document.getElementById("hud-fps");
            this.camEl = document.getElementById("hud-cam");
            this.posXEl = document.getElementById("hud-pos-x");
            this.posYEl = document.getElementById("hud-pos-y");
            this.posZEl = document.getElementById("hud-pos-z");
            this.scoreEl = document.getElementById("hud-score");
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
    update(fps, cam, x, y, z, score, total) {
        if (!this.enabled || !this.root || this.root.style.display === "none")
            return;
        if (this.fpsEl)
            this.fpsEl.textContent = fps.toString();
        if (this.camEl)
            this.camEl.textContent = cam;
        if (this.posXEl)
            this.posXEl.textContent = x.toFixed(1);
        if (this.posYEl)
            this.posYEl.textContent = y.toFixed(1);
        if (this.posZEl)
            this.posZEl.textContent = z.toFixed(1);
        if (this.scoreEl)
            this.scoreEl.textContent = `${score} / ${total}`;
    }
}
//# sourceMappingURL=HUD.js.map