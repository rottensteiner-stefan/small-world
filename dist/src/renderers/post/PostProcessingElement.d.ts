import { ToneMappingMode } from '../../enums/index.js';
/**
 * Base class for a post-processing element (effect).
 */
export declare abstract class PostProcessingElement {
    /** If false, the effect will be bypassed (cheap). */
    enabled: boolean;
    /** Unique string identifier for the effect. */
    abstract readonly type: string;
}
/**
 * Tone Mapping and Gamma Correction parameters.
 */
export declare class ToneMappingElement extends PostProcessingElement {
    readonly type = "ToneMapping";
    mode: ToneMappingMode;
    exposure: number;
    gamma: number;
}
/**
 * Vignette effect parameters.
 */
export declare class VignetteElement extends PostProcessingElement {
    readonly type = "Vignette";
    /** Controls the outer radius of the vignette effect (default: 0.8). */
    offset: number;
    /** Controls the intensity of the vignette effect (default: 0.5) */
    darkness: number;
    /** Controls the shape. 2.0 = elliptical, 6.0+ = rounded rectangle (default: 2.0) */
    roundness: number;
}
export declare class GrainElement extends PostProcessingElement {
    readonly type = "Grain";
    /** Controls the intensity/opacity of the film grain (default: 0.05) */
    intensity: number;
}
