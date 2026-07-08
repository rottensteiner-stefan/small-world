/// src/renderers/post/elements/BloomElement.ts
import { PostProcessingElement } from "../PostProcessingElement.js";
import { PostProcessingEffectType } from "../../../enums/index.js";
import { Color } from "../../../core/colors/index.js";

/**
 * Bloom effect parameters.
 */
export class BloomElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.BLOOM;

  /** The brightness threshold at which bloom is applied (default: 1.0). */
  public threshold: number = 1.0;
  /** Controls the soft knee for the threshold (default: 0.1). */
  public softThreshold: number = 0.1;
  /** Intensity of the bloom effect (default: 1.0). */
  public intensity: number = 1.0;
  /** Radius/spread of the bloom. Controls the filter weights or mip level accumulation (default: 1.0). */
  public radius: number = 1.0;
  /** Color tint applied to the bloom highlights (default: white). */
  public color: Color = new Color(1.0, 1.0, 1.0);
}
