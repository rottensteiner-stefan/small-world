import { Behavior } from "../../core/behaviors/index.js";
import { Object3D } from "../../core/index.js";
import { Vector3D, MathPool } from "../../math/index.js";
import { StandardMaterial } from "../../core/materials/index.js";
import { Color } from "../../core/colors/index.js";

export interface WispBehaviorOptions {
  /** One endpoint of the fixed patrol track. */
  pointA: Vector3D;
  /** The other endpoint of the fixed patrol track. */
  pointB: Vector3D;
  /** Full A-to-B-to-A cycle duration, in seconds. Defaults to 4.8 (matches the concept sketches). */
  cycleSeconds?: number;
}

/**
 * A Wisp: a small drone that patrols a fixed back-and-forth track (never random --
 * see the "Patrol Read" concept sketch) and briefly flashes amber on contact
 * instead of taking damage. Wisps redirect/startle, they don't fight.
 */
export class WispBehavior extends Behavior {
  private _pointA: Vector3D;
  private _pointB: Vector3D;
  private _cycleSeconds: number;
  private _phase: number = 0;

  private _struckTimer: number = 0;
  private static readonly _STRUCK_DURATION = 0.6;
  private static readonly _STRUCK_COOLDOWN = 1.2;
  private _cooldownTimer: number = 0;

  constructor(options: WispBehaviorOptions) {
    super();
    this._pointA = options.pointA;
    this._pointB = options.pointB;
    this._cycleSeconds = options.cycleSeconds ?? 4.8;
  }

  /** Whether this Wisp can currently be struck (i.e. isn't already mid-flash). */
  public get canBeStruck(): boolean {
    return this._cooldownTimer <= 0;
  }

  /** Triggers the amber contact flash. No-op while on cooldown from a previous strike. */
  public strike(): void {
    if (!this.canBeStruck) return;
    this._struckTimer = WispBehavior._STRUCK_DURATION;
    this._cooldownTimer = WispBehavior._STRUCK_COOLDOWN;
  }

  public override update(deltaTime: number): void {
    if (!this.target) return;
    const obj = this.target as Object3D;

    this._phase = (this._phase + deltaTime / this._cycleSeconds) % 1;
    // Triangle wave: 0 -> 1 -> 0 across one cycle, so motion eases at both endpoints.
    const tri = this._phase < 0.5 ? this._phase * 2 : 2 - this._phase * 2;

    const pos = MathPool.acquireVector().copyFrom(this._pointB).sub(this._pointA).scale(tri);
    obj.position.copyFrom(this._pointA).add(pos);
    MathPool.releaseVector(pos);

    if (this._cooldownTimer > 0) this._cooldownTimer -= deltaTime;
    if (this._struckTimer > 0) {
      this._struckTimer -= deltaTime;
      this._applyStruckVisual(obj, this._struckTimer / WispBehavior._STRUCK_DURATION);
    } else {
      this._applyPatrolVisual(obj);
    }
  }

  private _applyPatrolVisual(obj: Object3D): void {
    if (!(obj.material instanceof StandardMaterial)) return;
    obj.material.emissiveColor.set(1.0, 0.5, 0.15);
    obj.material.emissiveIntensity = 1.2 + Math.sin(this._phase * Math.PI * 2) * 0.2;
    obj.scale.set(1, 1, 1);
  }

  private _applyStruckVisual(obj: Object3D, remaining: number): void {
    if (obj.material instanceof StandardMaterial) {
      obj.material.emissiveColor.copyFrom(Color.WHITE);
      obj.material.emissiveIntensity = 2.0 + remaining * 4.0;
    }
    // Small shatter "flinch": briefly larger, then settles back as the flash fades.
    const flinch = 1.0 + remaining * 0.8;
    obj.scale.set(flinch, flinch, flinch);
  }
}
