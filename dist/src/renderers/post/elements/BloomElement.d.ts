import { PostProcessingElement } from '../PostProcessingElement.js';
import { PostProcessingEffectType } from '../../../enums/index.js';
import { Color } from '../../../core/colors/index.js';
/**
 * Bloom effect parameters.
 */
export declare class BloomElement extends PostProcessingElement {
    readonly type = PostProcessingEffectType.BLOOM;
    /** The brightness threshold at which bloom is applied (default: 1.0). */
    threshold: number;
    /** Controls the soft knee for the threshold (default: 0.1). */
    softThreshold: number;
    /** Intensity of the bloom effect (default: 1.0). */
    intensity: number;
    /** Radius/spread of the bloom. Controls the filter weights or mip level accumulation (default: 1.0). */
    radius: number;
    /** Color tint applied to the bloom highlights (default: white). */
    color: Color;
}
