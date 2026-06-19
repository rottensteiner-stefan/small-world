/// src/renderers/post/PostProcessingElement.ts
import { ToneMappingMode, PostProcessingEffectType } from "../../enums/index.js";
import { Color } from "../../core/colors/Color.js";
/**
 * Base class for a post-processing element (effect).
 */
export class PostProcessingElement {
    /** If false, the effect will be bypassed (cheap). */
    enabled = true;
}
/**
 * Tone Mapping and Gamma Correction parameters.
 */
export class ToneMappingElement extends PostProcessingElement {
    type = PostProcessingEffectType.TONE_MAPPING;
    mode = ToneMappingMode.ACES_FILMIC;
    exposure = 1.0;
    gamma = 2.2;
}
/**
 * Vignette effect parameters.
 */
export class VignetteElement extends PostProcessingElement {
    type = PostProcessingEffectType.VIGNETTE;
    /** Controls the outer radius of the vignette effect (default: 0.8). */
    offset = 0.8;
    /** Controls the intensity of the vignette effect (default: 0.5) */
    darkness = 0.5;
    /** Controls the shape. 2.0 = elliptical, 6.0+ = rounded rectangle (default: 2.0) */
    roundness = 2.0;
}
export class GrainElement extends PostProcessingElement {
    type = PostProcessingEffectType.GRAIN;
    /** Controls the intensity/opacity of the film grain (default: 0.05) */
    intensity = 0.05;
}
/**
 * Bloom effect parameters.
 */
export class BloomElement extends PostProcessingElement {
    type = PostProcessingEffectType.BLOOM;
    /** The brightness threshold at which bloom is applied (default: 1.0). */
    threshold = 1.0;
    /** Controls the soft knee for the threshold (default: 0.1). */
    softThreshold = 0.1;
    /** Intensity of the bloom effect (default: 1.0). */
    intensity = 1.0;
    /** Radius/spread of the bloom. Controls the filter weights or mip level accumulation (default: 1.0). */
    radius = 1.0;
    /** Color tint applied to the bloom highlights (default: white). */
    color = new Color(1.0, 1.0, 1.0);
}
//# sourceMappingURL=PostProcessingElement.js.map