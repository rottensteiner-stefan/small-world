/// src/renderers/post/PostProcessingElement.ts

import { ToneMappingMode, PostProcessingEffectType } from "../../enums/index.js";
import { Color } from "../../core/colors/Color.js";

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

/**
 * Bloom effect parameters.
 */
export class BloomElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.BLOOM;

  /** The brightness threshold at which bloom is applied (default: 1.0). */
  public threshold: number = 1.0;
  /** Controls the soft knee for the threshold (default: 0.1). */
  public softThreshold: number = 0.1;
  /** Intensity of the bloom effect (default: 1.0). */
  public intensity: number = 1.0;
  /** Radius/spread of the bloom. Controls the filter weights or mip level accumulation (default: 1.0). */
  public radius: number = 1.0;
  /** Color tint applied to the bloom highlights (default: white). */
  public color: Color = new Color(1.0, 1.0, 1.0);
}

/**
 * Quantize/Posterize effect parameters for 8-bit retro banding.
 */
export class QuantizeElement extends PostProcessingElement {
  public readonly type = PostProcessingEffectType.QUANTIZE;

  /** Number of color steps per RGB channel. E.g. 8.0 = 3 bits per channel. */
  public steps: number = 8.0;
}
