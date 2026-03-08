import { ENGINE_VERSION } from "./Engine.js";

export class HUD {
  private root: HTMLElement | null = null;
  private fpsEl: HTMLElement | null = null;
  private camEl: HTMLElement | null = null;
  private posXEl: HTMLElement | null = null;
  private posYEl: HTMLElement | null = null;
  private posZEl: HTMLElement | null = null;
  private scoreEl: HTMLElement | null = null;
  private visibleEl: HTMLElement | null = null; // <--- NEU

  constructor(private enabled: boolean) {}

  public async init(): Promise<void> {
    if (!this.enabled) return;
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
    } catch (e) {
      console.error("[HUD] Failed to load template:", e);
    }
  }

  public setVisible(visible: boolean): void {
    if (this.root) {
      this.root.style.display = visible ? "block" : "none";
    }
  }

  // <--- NEU: visibleCount als Parameter hinzugefügt
  public update(
      fps: number,
      cam: string,
      x: number,
      y: number,
      z: number,
      score: number,
      total: number,
      visibleCount: number
  ) {
    if (!this.enabled || !this.root || this.root.style.display === "none") return;
    if (this.fpsEl) this.fpsEl.textContent = fps.toString();
    if (this.camEl) this.camEl.textContent = cam;
    if (this.posXEl) this.posXEl.textContent = x.toFixed(1);
    if (this.posYEl) this.posYEl.textContent = y.toFixed(1);
    if (this.posZEl) this.posZEl.textContent = z.toFixed(1);
    if (this.scoreEl) this.scoreEl.textContent = `${score} / ${total}`;
    if (this.visibleEl) this.visibleEl.textContent = visibleCount.toString(); // <--- NEU
  }
}