import { Behavior } from "../../../../core/behaviors/index.js";
import { Object3D, Scene } from "../../../../core/index.js";
import { StandardMaterial } from "../../../../core/materials/index.js";
import { Easing } from "../../../../math/Easing.js";

export interface ImpactFlashOptions {
  /** Removes the flash's Object3D from this scene once it's finished fading. */
  scene: Scene;
  /** How long the flash takes to fade out, in seconds. Defaults to 0.4. */
  duration?: number;
  /** emissiveIntensity at the moment of impact, easing down to 0. Defaults to 8.0. */
  peakIntensity?: number;
}

/**
 * Impact Trace: a short-lived emissive spark spawned at a collision point (Wisp
 * contact, a hard fall reset) and removed once it's faded, per the "seam network
 * lights up on impact" concept sketch. Deliberately not folded into the level's
 * shared InstancedSeams mesh -- that mesh has no per-instance emissive control (its
 * one instance-data channel is already used for texture atlasing elsewhere in the
 * engine), so each flash is its own small Object3D instead, the same idiom
 * LevelBuilder already uses for Frostglass panels needing independent material state.
 */
export class ImpactFlashBehavior extends Behavior {
  private _scene: Scene;
  private _duration: number;
  private _peakIntensity: number;
  private _elapsed: number = 0;

  constructor(options: ImpactFlashOptions) {
    super();
    this._scene = options.scene;
    this._duration = options.duration ?? 0.4;
    this._peakIntensity = options.peakIntensity ?? 8.0;
  }

  public override update(deltaTime: number): void {
    if (!this.target) return;
    const obj = this.target as Object3D;

    this._elapsed += deltaTime;
    if (this._elapsed >= this._duration) {
      this._scene.remove(obj);
      return;
    }

    if (obj.material instanceof StandardMaterial) {
      const t = this._elapsed / this._duration;
      obj.material.emissiveIntensity = (1.0 - Easing.easeInQuad(t)) * this._peakIntensity;
    }
  }
}
