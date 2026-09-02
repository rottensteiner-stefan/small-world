import { PostProcessingElement } from "../PostProcessingElement.js";
import { PostProcessingEffectType } from "../../../enums/index.js";
import { Color } from "../../../core/colors/index.js";

/**
 * Toon-outline / edge detection effect parameters for Comic / Graphic Novel style.
 */
export class OutlineElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.OUTLINE;

  /** Opt-in: outline should not apply unless explicitly requested. */
  public override enabled: boolean = false;

  /** Outline width/thickness in pixels. */
  public thickness: number = 1.0;

  /** Edge sensitivity threshold (higher = sharper edge detection). */
  public sensitivity: number = 1.0;

  /** Color of the ink outline. */
  public color: Color = new Color(0, 0, 0, 1);
}
