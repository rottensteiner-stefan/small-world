import { EventDispatcherImpl } from "../../../core/index.js";
import { Events } from "../Events.js";

const INSTANCE_MAX = 3;

/** Diegetisches HUD: Integrität (HP), Instanzen (Leben), Disc-Status.
 *  Language: in-universe "program readout", never "health" or "lives". */
export class Hud {
  private _root!: HTMLElement;
  private _integrityEl!: HTMLElement;
  private _instancesEl!: HTMLElement;
  private _discStatusEl!: HTMLElement;

  private _integrity: number = 100;
  private _instances: number = INSTANCE_MAX;

  constructor(private _events: EventDispatcherImpl) {
    this._build();
    this._bindEvents();
  }

  private _build(): void {
    this._root = document.createElement("div");
    this._root.id = "dw-hud";
    Object.assign(this._root.style, {
      position: "fixed",
      top: "20px",
      left: "20px",
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      letterSpacing: "0.08em",
      color: "#39FF14",
      textShadow: "0 0 8px #39FF14",
      userSelect: "none",
      pointerEvents: "none",
      lineHeight: "1.8",
    });

    this._integrityEl = document.createElement("div");
    this._instancesEl = document.createElement("div");
    this._discStatusEl = document.createElement("div");
    Object.assign(this._discStatusEl.style, { color: "#00FFFF", textShadow: "0 0 8px #00FFFF" });

    this._root.appendChild(this._integrityEl);
    this._root.appendChild(this._instancesEl);
    this._root.appendChild(this._discStatusEl);
    document.body.appendChild(this._root);

    this._render();
  }

  private _bindEvents(): void {
    this._events.addEventListener(Events.INTEGRITY_CHANGED, (data: unknown): void => {
      const { integrity } = data as { integrity: number };
      this._integrity = Math.max(0, Math.min(100, integrity));
      this._render();
    });

    this._events.addEventListener(Events.INSTANCE_LOST, (): void => {
      this._instances = Math.max(0, this._instances - 1);
      this._integrity = 100;
      this._flash();
      this._render();
    });

    this._events.addEventListener(Events.DISC_THROWN, (): void => {
      this._discStatusEl.textContent = "DISC  ·  UNTERWEGS";
    });

    this._events.addEventListener(Events.DISC_CAUGHT, (): void => {
      this._discStatusEl.textContent = "DISC  ·  BEREIT";
    });
  }

  private _render(): void {
    this._integrityEl.textContent = `INTEGRITÄT  ·  ${this._integrity.toFixed(0)}%`;
    this._instancesEl.textContent = `INSTANZEN   ·  ${"█".repeat(this._instances)}${"░".repeat(INSTANCE_MAX - this._instances)}`;
  }

  private _flash(): void {
    this._root.style.filter = "blur(2px) brightness(3)";
    setTimeout(() => {
      this._root.style.filter = "";
    }, 200);
  }

  public setDiscReady(): void {
    this._discStatusEl.textContent = "DISC  ·  BEREIT";
  }

  public dispose(): void {
    this._root.remove();
  }
}
