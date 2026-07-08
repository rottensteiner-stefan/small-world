import { PostProcessingElement } from '../PostProcessingElement.js';
import { PostProcessingEffectType } from '../../../enums/index.js';
/**
 * Quantize/Posterize effect parameters for 8-bit retro banding.
 */
export declare class QuantizeElement extends PostProcessingElement {
    readonly type = PostProcessingEffectType.QUANTIZE;
    /** Number of color steps per RGB channel. E.g. 8.0 = 3 bits per channel. */
    steps: number;
}
