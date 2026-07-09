/// src/renderers/post/elements/ToneMappingElement.ts
import { PostProcessingElement } from "../PostProcessingElement.js";
import { ToneMappingMode, PostProcessingEffectType } from "../../../enums/index.js";

/**
 * Tone Mapping and Gamma Correction parameters.
 */
export class ToneMappingElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.TONE_MAPPING;

  public mode: ToneMappingMode = ToneMappingMode.ACES_FILMIC;
  public exposure: number = 1.0;
  public gamma: number = 2.2;
}
