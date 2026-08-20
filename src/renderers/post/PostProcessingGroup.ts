import { PostProcessingElement } from "./PostProcessingElement.js";
import {
  ToneMappingElement,
  VignetteElement,
  GrainElement,
  BloomElement,
  QuantizeElement,
  HbaoElement,
  TaaElement,
  MotionTrailElement,
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
    this.add(new ToneMappingElement());
    this.add(new VignetteElement());
    this.add(new GrainElement());
    this.add(new BloomElement());
    this.add(new QuantizeElement());
    this.add(new HbaoElement());
    this.add(new TaaElement());
    this.add(new MotionTrailElement());
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

    const effects = config.effects;
    if (!effects) return;

    if (effects.toneMapping) {
      const tm = this.get<ToneMappingElement>(PostProcessingEffectType.TONE_MAPPING);
      if (tm) {
        if (effects.toneMapping.enabled !== undefined) tm.enabled = effects.toneMapping.enabled;
        if (effects.toneMapping.mode !== undefined) tm.mode = effects.toneMapping.mode;
        if (effects.toneMapping.exposure !== undefined) tm.exposure = effects.toneMapping.exposure;
        if (effects.toneMapping.gamma !== undefined) tm.gamma = effects.toneMapping.gamma;
      }
    }

    if (effects.vignette) {
      const vig = this.get<VignetteElement>(PostProcessingEffectType.VIGNETTE);
      if (vig) {
        if (effects.vignette.enabled !== undefined) vig.enabled = effects.vignette.enabled;
        if (effects.vignette.offset !== undefined) vig.offset = effects.vignette.offset;
        if (effects.vignette.darkness !== undefined) vig.darkness = effects.vignette.darkness;
        if (effects.vignette.roundness !== undefined) vig.roundness = effects.vignette.roundness;
      }
    }

    if (effects.grain) {
      const grain = this.get<GrainElement>(PostProcessingEffectType.GRAIN);
      if (grain) {
        if (effects.grain.enabled !== undefined) grain.enabled = effects.grain.enabled;
        if (effects.grain.intensity !== undefined) grain.intensity = effects.grain.intensity;
      }
    }

    if (effects.bloom) {
      const bloom = this.get<BloomElement>(PostProcessingEffectType.BLOOM);
      if (bloom) {
        if (effects.bloom.enabled !== undefined) bloom.enabled = effects.bloom.enabled;
        if (effects.bloom.threshold !== undefined) bloom.threshold = effects.bloom.threshold;
        if (effects.bloom.softThreshold !== undefined)
          bloom.softThreshold = effects.bloom.softThreshold;
        if (effects.bloom.intensity !== undefined) bloom.intensity = effects.bloom.intensity;
        if (effects.bloom.radius !== undefined) bloom.radius = effects.bloom.radius;
        if (effects.bloom.color !== undefined) {
          const col = effects.bloom.color;
          if (Array.isArray(col)) {
            bloom.color.set(col[0], col[1], col[2]);
          } else if (typeof col === "object" && col !== null) {
            bloom.color.set(col.r, col.g, col.b);
          }
        }
      }
    }

    if (effects.quantize) {
      const quant = this.get<QuantizeElement>(PostProcessingEffectType.QUANTIZE);
      if (quant) {
        if (effects.quantize.enabled !== undefined) quant.enabled = effects.quantize.enabled;
        if (effects.quantize.steps !== undefined) quant.steps = effects.quantize.steps;
      }
    }

    if (effects.hbao) {
      const hbao = this.get<HbaoElement>(PostProcessingEffectType.HBAO);
      if (hbao) {
        if (effects.hbao.enabled !== undefined) hbao.enabled = effects.hbao.enabled;
        if (effects.hbao.radius !== undefined) hbao.radius = effects.hbao.radius;
        if (effects.hbao.intensity !== undefined) hbao.intensity = effects.hbao.intensity;
      }
    }

    if (effects.taa) {
      const taa = this.get<TaaElement>(PostProcessingEffectType.TAA);
      if (taa) {
        if (effects.taa.enabled !== undefined) taa.enabled = effects.taa.enabled;
        if (effects.taa.feedback !== undefined) taa.feedback = effects.taa.feedback;
      }
    }

    if (effects.motionTrail) {
      const trail = this.get<MotionTrailElement>(PostProcessingEffectType.MOTION_TRAIL);
      if (trail) {
        if (effects.motionTrail.enabled !== undefined) trail.enabled = effects.motionTrail.enabled;
        if (effects.motionTrail.feedback !== undefined)
          trail.feedback = effects.motionTrail.feedback;
      }
    }
  }
}
