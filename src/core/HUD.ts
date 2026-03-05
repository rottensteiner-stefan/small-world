export class HUD {
  private fpsEl: HTMLElement | null = null;
  private camEl: HTMLElement | null = null;
  private posXEl: HTMLElement | null = null;
  private posYEl: HTMLElement | null = null;
  private posZEl: HTMLElement | null = null;
  private scoreEl: HTMLElement | null = null;

  constructor(private enabled: boolean) {}

  public async init(): Promise<void> {
    if (!this.enabled) return;
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
    } catch (e) {
      console.error("[HUD] Failed to load template:", e);
    }
  }

  public update(
    fps: number,
    cam: string,
    x: number,
    y: number,
    z: number,
    score: number,
    total: number,
  ) {
    if (!this.enabled) return;
    if (this.fpsEl) this.fpsEl.textContent = fps.toString();
    if (this.camEl) this.camEl.textContent = cam;
    if (this.posXEl) this.posXEl.textContent = x.toFixed(1);
    if (this.posYEl) this.posYEl.textContent = y.toFixed(1);
    if (this.posZEl) this.posZEl.textContent = z.toFixed(1);
    if (this.scoreEl) this.scoreEl.textContent = `${score} / ${total}`;
  }
}
