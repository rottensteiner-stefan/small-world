import { Events } from "../Events.js";
import { EventDispatcherImpl } from "../../../core/index.js";

/**
 * The whole HUD, per the "HUD Concept" sketch: Clarity Pulse charge pips
 * (bottom-left) and a running Disc count (bottom-right). No health bar --
 * nothing in Neon Labyrinth needs one yet.
 */
export class Hud {
  private _container: HTMLDivElement;
  private _pipEls: HTMLDivElement[] = [];
  private _discCountEl: HTMLSpanElement;
  private _discCount: number = 0;
  private _exfilEl: HTMLDivElement;

  constructor(private events: EventDispatcherImpl) {
    if (!document.getElementById("neon-labyrinth-hud-style")) {
      const style = document.createElement("style");
      style.id = "neon-labyrinth-hud-style";
      style.textContent = `
        .nl-hud {
          position: absolute;
          inset: 0;
          pointer-events: none;
          font-family: ui-monospace, "SF Mono", "JetBrains Mono", Consolas, monospace;
          z-index: 100;
        }
        .nl-hud-corner {
          position: absolute;
          bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nl-hud-corner.left { left: 18px; }
        .nl-hud-corner.right { right: 18px; }
        .nl-pip {
          width: 14px;
          height: 14px;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          background: rgba(91, 233, 239, 0.15);
          transition: background 0.2s ease;
        }
        .nl-pip.charged {
          background: rgba(91, 233, 239, 0.85);
          box-shadow: 0 0 10px rgba(91, 233, 239, 0.7);
        }
        .nl-hud-label {
          color: rgba(211, 214, 234, 0.6);
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .nl-disc-count {
          color: rgba(255, 247, 230, 0.9);
          font-size: 18px;
        }
        .nl-hud-exfil {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(5, 5, 8, 0.55);
          opacity: 0;
          transition: opacity 0.6s ease;
        }
        .nl-hud-exfil.visible {
          opacity: 1;
        }
        .nl-hud-exfil-text {
          font-size: 42px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.95);
          text-shadow: 0 0 30px rgba(150, 220, 255, 0.8);
        }
      `;
      document.head.appendChild(style);
    }

    this._container = document.createElement("div");
    this._container.className = "nl-hud";

    const left = document.createElement("div");
    left.className = "nl-hud-corner left";
    for (let i = 0; i < 3; i++) {
      const pip = document.createElement("div");
      pip.className = "nl-pip charged";
      this._pipEls.push(pip);
      left.appendChild(pip);
    }
    const clarityLabel = document.createElement("span");
    clarityLabel.className = "nl-hud-label";
    clarityLabel.textContent = "CLARITY";
    left.appendChild(clarityLabel);

    const right = document.createElement("div");
    right.className = "nl-hud-corner right";
    this._discCountEl = document.createElement("span");
    this._discCountEl.className = "nl-disc-count";
    this._discCountEl.textContent = "0";
    const discLabel = document.createElement("span");
    discLabel.className = "nl-hud-label";
    discLabel.textContent = "DISCS";
    right.appendChild(this._discCountEl);
    right.appendChild(discLabel);

    this._container.appendChild(left);
    this._container.appendChild(right);

    this._exfilEl = document.createElement("div");
    this._exfilEl.className = "nl-hud-exfil";
    const exfilText = document.createElement("span");
    exfilText.className = "nl-hud-exfil-text";
    exfilText.textContent = "Extraction Complete";
    this._exfilEl.appendChild(exfilText);
    this._container.appendChild(this._exfilEl);

    const host = document.getElementById("retro-screen") ?? document.body;
    host.appendChild(this._container);

    this._bindEvents();
  }

  private _bindEvents(): void {
    this.events.addEventListener(Events.DISC_COLLECTED, (): void => {
      this._discCount++;
      this._discCountEl.textContent = this._discCount.toString();
    });
    this.events.addEventListener(Events.EXFIL_REACHED, (): void => {
      this._exfilEl.classList.add("visible");
    });
  }

  /** Called every frame so the Clarity pips reflect the controller's live charge count. */
  public update(clarityCharges: number, clarityMaxCharges: number): void {
    for (let i = 0; i < this._pipEls.length; i++) {
      const charged = i < clarityCharges && i < clarityMaxCharges;
      this._pipEls[i]!.classList.toggle("charged", charged);
    }
  }
}
