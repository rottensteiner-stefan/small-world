import { Events } from "../Events.js";
import { EventDispatcherImpl } from "../../../core/index.js";

/**
 * The whole HUD, per the "HUD Concept" sketch: Clarity Pulse charge pips
 * (bottom-left) and a running Disc count (bottom-right). No health bar --
 * nothing in Hollow Circuit needs one yet.
 */
export class Hud {
  private _container: HTMLDivElement;
  private _pipEls: HTMLDivElement[] = [];
  private _discCountEl: HTMLSpanElement;
  private _discCount: number = 0;

  constructor(private events: EventDispatcherImpl) {
    if (!document.getElementById("hollow-circuit-hud-style")) {
      const style = document.createElement("style");
      style.id = "hollow-circuit-hud-style";
      style.textContent = `
        .hc-hud {
          position: absolute;
          inset: 0;
          pointer-events: none;
          font-family: ui-monospace, "SF Mono", "JetBrains Mono", Consolas, monospace;
          z-index: 100;
        }
        .hc-hud-corner {
          position: absolute;
          bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hc-hud-corner.left { left: 18px; }
        .hc-hud-corner.right { right: 18px; }
        .hc-pip {
          width: 14px;
          height: 14px;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          background: rgba(91, 233, 239, 0.15);
          transition: background 0.2s ease;
        }
        .hc-pip.charged {
          background: rgba(91, 233, 239, 0.85);
          box-shadow: 0 0 10px rgba(91, 233, 239, 0.7);
        }
        .hc-hud-label {
          color: rgba(211, 214, 234, 0.6);
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .hc-disc-count {
          color: rgba(255, 247, 230, 0.9);
          font-size: 18px;
        }
      `;
      document.head.appendChild(style);
    }

    this._container = document.createElement("div");
    this._container.className = "hc-hud";

    const left = document.createElement("div");
    left.className = "hc-hud-corner left";
    for (let i = 0; i < 3; i++) {
      const pip = document.createElement("div");
      pip.className = "hc-pip charged";
      this._pipEls.push(pip);
      left.appendChild(pip);
    }
    const clarityLabel = document.createElement("span");
    clarityLabel.className = "hc-hud-label";
    clarityLabel.textContent = "CLARITY";
    left.appendChild(clarityLabel);

    const right = document.createElement("div");
    right.className = "hc-hud-corner right";
    this._discCountEl = document.createElement("span");
    this._discCountEl.className = "hc-disc-count";
    this._discCountEl.textContent = "0";
    const discLabel = document.createElement("span");
    discLabel.className = "hc-hud-label";
    discLabel.textContent = "DISCS";
    right.appendChild(this._discCountEl);
    right.appendChild(discLabel);

    this._container.appendChild(left);
    this._container.appendChild(right);

    const host = document.getElementById("retro-screen") ?? document.body;
    host.appendChild(this._container);

    this._bindEvents();
  }

  private _bindEvents(): void {
    this.events.addEventListener(Events.DISC_COLLECTED, (): void => {
      this._discCount++;
      this._discCountEl.textContent = this._discCount.toString();
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
