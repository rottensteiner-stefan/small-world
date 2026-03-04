export class HUD {
    enabled;
    root = null;
    fpsEl = null;
    camEl = null;
    posXEl = null;
    posYEl = null;
    posZEl = null;
    constructor(enabled) {
        this.enabled = enabled;
    }
    async init() {
        if (!this.enabled)
            return;
        try {
            const response = await fetch("./resources/hud.template.html");
            const html = await response.text();
            const container = document.createElement("div");
            container.innerHTML = html;
            document.body.appendChild(container);
            this.root = document.getElementById("sw-hud-root");
            this.fpsEl = document.getElementById("hud-fps");
            this.camEl = document.getElementById("hud-cam");
            this.posXEl = document.getElementById("hud-pos-x");
            this.posYEl = document.getElementById("hud-pos-y");
            this.posZEl = document.getElementById("hud-pos-z");
        }
        catch (e) {
            console.error("[HUD] Failed to load template:", e);
        }
    }
    update(fps, strategy, x, y, z) {
        if (!this.enabled || !this.root)
            return;
        if (this.fpsEl)
            this.fpsEl.textContent = `${fps} FPS`;
        if (this.camEl)
            this.camEl.textContent = strategy;
        if (this.posXEl)
            this.posXEl.textContent = x.toFixed(1);
        if (this.posYEl)
            this.posYEl.textContent = y.toFixed(1);
        if (this.posZEl)
            this.posZEl.textContent = z.toFixed(1);
    }
}
//# sourceMappingURL=HUD.js.map