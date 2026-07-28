import { Behavior } from "../../../../core/behaviors/index.js";
import { Object3D } from "../../../../core/index.js";
import { StandardMaterial } from "../../../../core/materials/index.js";
import { MathUtils } from "../../../../math/index.js";

export interface FrostglassPanelBehaviorOptions {
  /** Opacity while at rest -- "milk-thick", per the material study. Defaults to 0.55. */
  restOpacity?: number;
  /** Opacity while revealed by a Clarity Pulse. Defaults to 0.12. */
  revealOpacity?: number;
  /** How quickly opacity eases between the two states, in units/second. Defaults to 3.0. */
  transitionSpeed?: number;
}

/**
 * A single Frostglass panel's reveal state (v1: driven purely by material opacity --
 * no dedicated blur shader yet, see the roadmap note in App.ts). At rest it
 * reads as heavy and half-blind; a nearby Clarity Pulse pulls its opacity down for a
 * few seconds so whatever's glowing behind it reads clearly.
 */
export class FrostglassPanelBehavior extends Behavior {
  private _restOpacity: number;
  private _revealOpacity: number;
  private _transitionSpeed: number;
  private _revealTimer: number = 0;

  constructor(options: FrostglassPanelBehaviorOptions = {}) {
    super();
    this._restOpacity = options.restOpacity ?? 0.55;
    this._revealOpacity = options.revealOpacity ?? 0.12;
    this._transitionSpeed = options.transitionSpeed ?? 3.0;
  }

  /** Starts (or refreshes) a reveal window of the given duration, in seconds. */
  public reveal(duration: number): void {
    this._revealTimer = Math.max(this._revealTimer, duration);
  }

  public override update(deltaTime: number): void {
    if (!this.target) return;
    const obj = this.target as Object3D;
    if (!(obj.material instanceof StandardMaterial)) return;

    if (this._revealTimer > 0) this._revealTimer -= deltaTime;
    const targetOpacity = this._revealTimer > 0 ? this._revealOpacity : this._restOpacity;

    obj.material.color.a = MathUtils.lerp(
      obj.material.color.a,
      targetOpacity,
      Math.min(1, this._transitionSpeed * deltaTime),
    );
  }
}
