/// src/core/cameras/effects/FlashEffect.ts

import { AbstractCameraEffect } from "./AbstractCameraEffect.js";
import { CameraEffectType } from "../../../enums/index.js";

/**
 * A flash effect for the camera (simulated via target offset or potentially other means).
 * Note: A real flash might need renderer support, but here we can simulate a 'jolt'.
 */
export class FlashEffect extends AbstractCameraEffect {
  /** @inheritdoc */
  public readonly type = CameraEffectType.FLASH;

  private _intensity: number;
  private _duration: number;
  private _elapsed: number = 0;

  /**
   * Creates a new FlashEffect.
   * @param intensity The intensity of the flash.
   * @param duration The duration of the flash in seconds.
   */
  constructor(intensity: number = 1.0, duration: number = 0.2) {
    super();
    this._intensity = intensity;
    this._duration = duration;
  }

  /** @inheritdoc */
  public update(deltaTime: number): void {
    this._elapsed += deltaTime;

    if (this._elapsed >= this._duration) {
      this.isFinished = true;
      this.targetOffset.set(0, 0, 0);
      return;
    }

    // Just a quick jolt up and down
    const progress = this._elapsed / this._duration;
    const offset = Math.sin(progress * Math.PI) * this._intensity;
    this.targetOffset.y = offset;
  }
}
