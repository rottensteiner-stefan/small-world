export class HUD {
    enabled;
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
            const response = await fetch("./resources/hud.template.html");
            const html = await response.text();
            const container = document.createElement("div");
            container.innerHTML = html;
            document.body.appendChild(container);
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
    update(fps, cam, x, y, z, score, total) {
        if (!this.enabled)
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