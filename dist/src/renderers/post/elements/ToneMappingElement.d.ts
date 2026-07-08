import { PostProcessingElement } from '../PostProcessingElement.js';
import { ToneMappingMode, PostProcessingEffectType } from '../../../enums/index.js';
/**
 * Tone Mapping and Gamma Correction parameters.
 */
export declare class ToneMappingElement extends PostProcessingElement {
    readonly type = PostProcessingEffectType.TONE_MAPPING;
    mode: ToneMappingMode;
    exposure: number;
    gamma: number;
}
