import { ENGINE_VERSION } from "./Engine.js";
export class HUD {
    enabled;
    root = null;
    fpsEl = null;
    camEl = null;
    posXEl = null;
    posYEl = null;
    posZEl = null;
    scoreEl = null;
    visibleEl = null; // <--- NEU
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
            this.fpsEl = document.getElementById("hud-fps");
            this.camEl = document.getElementById("hud-cam");
            this.posXEl = document.getElementById("hud-pos-x");
            this.posYEl = document.getElementById("hud-pos-y");
            this.posZEl = document.getElementById("hud-pos-z");
            this.scoreEl = document.getElementById("hud-score");
            this.visibleEl = document.getElementById("hud-visible"); // <--- NEU
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
    // <--- NEU: visibleCount als Parameter hinzugefügt
    update(fps, cam, x, y, z, score, total, visibleCount) {
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
        if (this.visibleEl)
            this.visibleEl.textContent = visibleCount.toString(); // <--- NEU
    }
}
//# sourceMappingURL=HUD.js.map