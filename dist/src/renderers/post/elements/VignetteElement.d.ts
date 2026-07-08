import { PostProcessingElement } from '../PostProcessingElement.js';
import { PostProcessingEffectType } from '../../../enums/index.js';
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
