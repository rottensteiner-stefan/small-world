/// src/renderers/post/PostProcessingElement.ts

import { ToneMappingMode, PostProcessingEffectType } from "../../enums/index.js";

/**
 * Base class for a post-processing element (effect).
 */
export abstract class PostProcessingElement {
  /** If false, the effect will be bypassed (cheap). */
  public enabled: boolean = true;
  /** Unique string identifier for the effect. */
  public abstract readonly type: PostProcessingEffectType;
}

/**
 * Tone Mapping and Gamma Correction parameters.
 */
export class ToneMappingElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.TONE_MAPPING;

  public mode: ToneMappingMode = ToneMappingMode.ACES_FILMIC;
  public exposure: number = 1.0;
  public gamma: number = 2.2;
}

/**
 * Vignette effect parameters.
 */
export class VignetteElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.VIGNETTE;

  /** Controls the outer radius of the vignette effect (default: 0.8). */
  public offset: number = 0.8;
  /** Controls the intensity of the vignette effect (default: 0.5) */
  public darkness: number = 0.5;
  /** Controls the shape. 2.0 = elliptical, 6.0+ = rounded rectangle (default: 2.0) */
  public roundness: number = 2.0;
}

export class GrainElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.GRAIN;

  /** Controls the intensity/opacity of the film grain (default: 0.05) */
  public intensity: number = 0.05;
}
