import { PostProcessingElement } from "./PostProcessingElement.js";
import {
  ToneMappingElement,
  VignetteElement,
  GrainElement,
  BloomElement,
  QuantizeElement,
} from "./elements/index.js";
import { PostProcessingEffectType } from "../../enums/index.js";

/**
 * A logical grouping of post-processing elements.
 * Currently acts as a "Global Volume", applying its elements to the entire scene.
 * In the future, this can be extended into a spatial BoundingVolume for local overrides.
 */
export class PostProcessingGroup {
  /** If false, the entire post-processing group is bypassed. */
  public enabled: boolean = false;

  /** Currently always true (Global Volume). */
  public isGlobal: boolean = true;

  /** The active shader filter mode (e.g. 0 = clean, 1 = nightvision, 2 = noir, 3 = cyber, 4 = vhs, 5 = underworld). */
  public filterMode: number = 0;

  private _elements: Map<PostProcessingEffectType, PostProcessingElement> = new Map();

  constructor() {
    // Add defaults so when enabled, it behaves like before
    this.add(new ToneMappingElement());
    this.add(new VignetteElement());
    this.add(new GrainElement());
    this.add(new BloomElement());
    this.add(new QuantizeElement());
  }

  /**
   * Adds or overwrites a post-processing element in this group.
   * @param element The element to add (e.g. VignetteElement)
   */
  public add(element: PostProcessingElement): this {
    this._elements.set(element.type, element);
    return this;
  }

  /**
   * Get an element by its type.
   * @param type The type
   */
  public get<T extends PostProcessingElement>(type: PostProcessingEffectType): T | undefined {
    return this._elements.get(type) as T;
  }

  /**
   * Removes an element by its type.
   */
  public delete(type: PostProcessingEffectType): boolean {
    return this._elements.delete(type);
  }

  /**
   * Loads configurations into elements from a configuration object.
   */
  public loadConfig(config?: import("../../interfaces/index.js").PostProcessingConfig): void {
    if (!config) return;
    if (config.enabled !== undefined) this.enabled = config.enabled;
    if (config.filterMode !== undefined) this.filterMode = config.filterMode;

    if (config.toneMapping) {
      const tm = this.get<ToneMappingElement>(PostProcessingEffectType.TONE_MAPPING);
      if (tm) {
        if (config.toneMapping.enabled !== undefined) tm.enabled = config.toneMapping.enabled;
        if (config.toneMapping.mode !== undefined) tm.mode = config.toneMapping.mode;
        if (config.toneMapping.exposure !== undefined) tm.exposure = config.toneMapping.exposure;
        if (config.toneMapping.gamma !== undefined) tm.gamma = config.toneMapping.gamma;
      }
    }

    if (config.vignette) {
      const vig = this.get<VignetteElement>(PostProcessingEffectType.VIGNETTE);
      if (vig) {
        if (config.vignette.enabled !== undefined) vig.enabled = config.vignette.enabled;
        if (config.vignette.offset !== undefined) vig.offset = config.vignette.offset;
        if (config.vignette.darkness !== undefined) vig.darkness = config.vignette.darkness;
        if (config.vignette.roundness !== undefined) vig.roundness = config.vignette.roundness;
      }
    }

    if (config.grain) {
      const grain = this.get<GrainElement>(PostProcessingEffectType.GRAIN);
      if (grain) {
        if (config.grain.enabled !== undefined) grain.enabled = config.grain.enabled;
        if (config.grain.intensity !== undefined) grain.intensity = config.grain.intensity;
      }
    }

    if (config.bloom) {
      const bloom = this.get<BloomElement>(PostProcessingEffectType.BLOOM);
      if (bloom) {
        if (config.bloom.enabled !== undefined) bloom.enabled = config.bloom.enabled;
        if (config.bloom.threshold !== undefined) bloom.threshold = config.bloom.threshold;
        if (config.bloom.softThreshold !== undefined)
          bloom.softThreshold = config.bloom.softThreshold;
        if (config.bloom.intensity !== undefined) bloom.intensity = config.bloom.intensity;
        if (config.bloom.radius !== undefined) bloom.radius = config.bloom.radius;
        if (config.bloom.color !== undefined) {
          const col = config.bloom.color;
          if (Array.isArray(col)) {
            bloom.color.set(col[0], col[1], col[2]);
          } else if (typeof col === "object" && col !== null) {
            bloom.color.set(col.r, col.g, col.b);
          }
        }
      }
    }

    if (config.quantize) {
      const quant = this.get<QuantizeElement>(PostProcessingEffectType.QUANTIZE);
      if (quant) {
        if (config.quantize.enabled !== undefined) quant.enabled = config.quantize.enabled;
        if (config.quantize.steps !== undefined) quant.steps = config.quantize.steps;
      }
    }
  }
}
