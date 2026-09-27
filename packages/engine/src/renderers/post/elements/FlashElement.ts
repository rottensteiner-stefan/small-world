import { PostProcessingElement } from "../PostProcessingElement.js";
import { PostProcessingEffectType } from "../../../enums/index.js";
import { Color } from "../../../core/colors/index.js";

/**
 * Full-screen flash overlay. `intensity` is normally driven per-frame by the engine loop from
 * the active camera's `flashIntensity`/`flashColor` (see camera `FlashEffect`), not set directly.
 */
export class FlashElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.FLASH;

  /** Tint color of the flash (default: white). */
  public color: Color = new Color(1.0, 1.0, 1.0);
  /** Current flash strength in [0, 1]. */
  public intensity: number = 0;
}
