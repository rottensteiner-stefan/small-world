import { ToneMappingMode, PostProcessingEffectType } from '../../enums/index.js';
import { Color } from '../../core/colors/Color.js';
/**
 * Base class for a post-processing element (effect).
 */
export declare abstract class PostProcessingElement {
    /** If false, the effect will be bypassed (cheap). */
    enabled: boolean;
    /** Unique string identifier for the effect. */
    abstract readonly type: PostProcessingEffectType;
}
/**
 * Tone Mapping and Gamma Correction parameters.
 */
export declare class ToneMappingElement extends PostProcessingElement {
    readonly type = PostProcessingEffectType.TONE_MAPPING;
    mode: ToneMappingMode;
    exposure: number;
    gamma: number;
}
/**
 * Vignette effect parameters.
 */
export declare class VignetteElement extends PostProcessingElement {
    readonly type = PostProcessingEffectType.VIGNETTE;
    /** Controls the outer radius of the vignette effect (default: 0.8). */
    offset: number;
    /** Controls the intensity of the vignette effect (default: 0.5) */
    darkness: number;
    /** Controls the shape. 2.0 = elliptical, 6.0+ = rounded rectangle (default: 2.0) */
    roundness: number;
}
export declare class GrainElement extends PostProcessingElement {
    readonly type = PostProcessingEffectType.GRAIN;
    /** Controls the intensity/opacity of the film grain (default: 0.05) */
    intensity: number;
}
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
/**
 * Quantize/Posterize effect parameters for 8-bit retro banding.
 */
export declare class QuantizeElement extends PostProcessingElement {
    readonly type = PostProcessingEffectType.QUANTIZE;
    /** Number of color steps per RGB channel. E.g. 8.0 = 3 bits per channel. */
    steps: number;
}
