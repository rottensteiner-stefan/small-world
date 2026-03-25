/// src/core/cameras/CameraEffectFactory.ts

import { CameraEffectType } from "../../enums/index.js";
import { CameraEffect } from "../../interfaces/index.js";
import { ShakeEffect } from "./effects/ShakeEffect.js";
import { FlashEffect } from "./effects/FlashEffect.js";

/**
 * Factory for creating camera effects.
 */
export class CameraEffectFactory {
  /**
   * Creates a new camera effect of the specified type.
   * @param type The type of effect to create.
   * @param intensity The intensity of the effect.
   * @param duration The duration of the effect in seconds.
   * @returns The created camera effect.
   */
  public static create(
    type: CameraEffectType,
    intensity: number = 0.5,
    duration: number = 0.5,
  ): CameraEffect {
    switch (type) {
      case CameraEffectType.SHAKE:
        return new ShakeEffect(intensity, duration);
      case CameraEffectType.FLASH:
        return new FlashEffect(intensity, duration);
      default:
        throw new Error(`Unknown camera effect type: ${type}`);
    }
  }
}
