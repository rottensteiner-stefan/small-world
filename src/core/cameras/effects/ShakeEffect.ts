import { AbstractCameraEffect } from "./AbstractCameraEffect.js";
import { CameraEffectType } from "../../../enums/index.js";
import { Noise } from "../../../utils/Noise.js";

/**
 * A screen shake effect for the camera, driven by a decaying "trauma" value
 * (trauma^2 envelope, per Squirrel Eiserloh's GDC talk "Juicing Your Cameras With Math")
 * and continuous simplex noise instead of per-frame white noise, so the shake reads as a
 * smooth wobble rather than a jittery flicker.
 */
export class ShakeEffect extends AbstractCameraEffect {
  /** @inheritdoc */
  public override readonly type: CameraEffectType = CameraEffectType.SHAKE;

  /** Simplex noise is sampled at this rate (in Hz-equivalent) along the elapsed time axis. */
  private static readonly _FREQUENCY = 20;

  private _intensity: number;
  private _duration: number;
  private _elapsed: number = 0;
  private readonly _seed: number;

  /**
   * Creates a new ShakeEffect.
   * @param intensity The maximum intensity of the shake.
   * @param duration The duration of the shake in seconds.
   */
  constructor(intensity: number = 0.5, duration: number = 0.5) {
    super();
    this._intensity = intensity;
    this._duration = duration;
    // Per-instance offset so overlapping/simultaneous shakes don't sample identical noise.
    this._seed = 1000 * Math.random();
  }

  /** @inheritdoc */
  public override update(deltaTime: number): void {
    this._elapsed += deltaTime;

    if (this._elapsed >= this._duration) {
      this.isFinished = true;
      this.offset.set(0, 0, 0);
      return;
    }

    const trauma: number = 1.0 - this._elapsed / this._duration;
    const envelope: number = this._intensity * trauma * trauma;
    const t: number = this._elapsed * ShakeEffect._FREQUENCY;

    this.offset.x = Noise.simplex2(t, this._seed) * envelope;
    this.offset.y = Noise.simplex2(t, this._seed + 100) * envelope;
    this.offset.z = Noise.simplex2(t, this._seed + 200) * envelope;
  }
}
