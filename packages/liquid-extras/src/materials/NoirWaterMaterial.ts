import {
  Color,
  StylizedWaterMaterial,
  StylizedWaterMaterialOptions,
  composeStylizedWaterSources,
  ShaderDefinition,
  RenderManifest,
} from "@small-world/engine";

export interface NoirWaterMaterialOptions extends StylizedWaterMaterialOptions {
  /** Number of ink tone levels, 2 = pure black/white, 3-6 = comic ink (default 4). Clamped to 2..8. */
  posterizeSteps?: number;
}

/**
 * NoirWaterMaterial demonstrates hook-based shader extension on top of
 * StylizedWaterMaterial without modifying or forking the engine core (ADR 0025).
 * The surface hook desaturates to luma, adds diagonal pen hatching (cross-hatched in the
 * deepest shadows) and quantizes the tone in perceptual (gamma) space into `posterizeSteps`
 * ink levels.
 *
 * Uniform lane reuse (the style struct is full): `posterizeSteps` travels in `u_styleA.w`
 * (lineWidth); the glitter and ripple line features of the base shader are therefore disabled
 * for this material (lineDensity and glitterStrength are forced to 0).
 */
export class NoirWaterMaterial extends StylizedWaterMaterial {
  public static readonly TYPE = "NoirWaterMaterial";

  constructor(options: NoirWaterMaterialOptions = {}) {
    const {
      shallowWaterColor = new Color(0.85, 0.85, 0.85),
      deepWaterColor = new Color(0.02, 0.02, 0.02),
      edgeColor = new Color(0.85, 0.85, 0.85),
      foamColor = new Color(0.85, 0.85, 0.85),
      causticStrength = 0.15,
      specularStrength = 0.25,
      rampSoftness = 0.1,
      washAmount = 0.3,
      foamSoftness = 0.04,
      skyTint = 0.2,
      foamDistance = 0.45,
      foamCutoff = 0.5,
      foamNoiseScale = 8.0,
      styleId = 3.0,
      posterizeSteps = 4,
      ...rest
    } = options;

    super(
      {
        shallowWaterColor,
        deepWaterColor,
        edgeColor,
        foamColor,
        causticStrength,
        specularStrength,
        rampSoftness,
        washAmount,
        foamSoftness,
        foamDistance,
        foamCutoff,
        foamNoiseScale,
        skyTint,
        styleId,
        ...rest,
        style: "custom",
        lineDensity: 0.0, // lane reuse: ripple lines off
        lineWidth: 0.0,
        glitterStrength: 0.0, // lane reuse: glitter off
      },
      NoirWaterMaterial.TYPE,
    );

    this.posterizeSteps = posterizeSteps;
  }

  private _posterizeSteps = 4;

  public get posterizeSteps(): number {
    return this._posterizeSteps;
  }

  public set posterizeSteps(value: number) {
    this._posterizeSteps = Math.min(8, Math.max(2, Math.round(value)));
  }

  public override getRenderManifest(): RenderManifest {
    const manifest = super.getRenderManifest();
    const props = manifest.properties as Record<string, number[]>;
    props["u_styleA"]![3] = this._posterizeSteps;
    return manifest;
  }

  protected override _getLiquidWaveShaderSources(): ShaderDefinition["sources"] {
    const glslSurface = `
    // Noir comic-ink desaturation, pen hatching and posterization injected via the surface hook
    float inkTone = pow(clamp(dot(finalColor, vec3(0.299, 0.587, 0.114)), 0.0, 1.0), 0.4545);
    inkTone = pow(inkTone, 1.3);
    float hatchW = (1.0 - inkTone) * 0.28;
    float hatchFreq = 4.0 + 3.0 * (1.0 - inkTone);
    float hatchWobble = 0.12 * sin((v_worldPos.x - v_worldPos.z) * 1.7);
    float hatchA = (1.0 - smoothstep(hatchW, hatchW + 0.04, abs(fract((v_worldPos.x + v_worldPos.z + hatchWobble) * hatchFreq) - 0.5))) * smoothstep(0.1, 0.25, inkTone) * (1.0 - smoothstep(0.5, 0.8, inkTone));
    float hatchB = (1.0 - smoothstep(hatchW, hatchW + 0.04, abs(fract((v_worldPos.x - v_worldPos.z + hatchWobble) * hatchFreq) - 0.5))) * smoothstep(0.06, 0.14, inkTone) * (1.0 - smoothstep(0.25, 0.4, inkTone));
    inkTone = clamp(inkTone - (hatchA + hatchB) * 0.45, 0.0, 1.0);
    float inkSteps = max(u_styleA.w - 1.0, 1.0);
    inkTone = floor(inkTone * inkSteps + 0.5) / inkSteps;
    finalColor = vec3(pow(inkTone, 2.2));
    `;

    const wgslSurface = `
    // Noir comic-ink desaturation, pen hatching and posterization injected via the surface hook
    var inkTone = pow(clamp(dot(finalColor, vec3<f32>(0.299, 0.587, 0.114)), 0.0, 1.0), 0.4545);
    inkTone = pow(inkTone, 1.3);
    let hatchW = (1.0 - inkTone) * 0.28;
    let hatchFreq = 4.0 + 3.0 * (1.0 - inkTone);
    let hatchWobble = 0.12 * sin((i.wp.x - i.wp.z) * 1.7);
    let hatchA = (1.0 - smoothstep(hatchW, hatchW + 0.04, abs(fract((i.wp.x + i.wp.z + hatchWobble) * hatchFreq) - 0.5))) * smoothstep(0.1, 0.25, inkTone) * (1.0 - smoothstep(0.5, 0.8, inkTone));
    let hatchB = (1.0 - smoothstep(hatchW, hatchW + 0.04, abs(fract((i.wp.x - i.wp.z + hatchWobble) * hatchFreq) - 0.5))) * smoothstep(0.06, 0.14, inkTone) * (1.0 - smoothstep(0.25, 0.4, inkTone));
    inkTone = clamp(inkTone - (hatchA + hatchB) * 0.45, 0.0, 1.0);
    let inkSteps = max(obj.styleA.w - 1.0, 1.0);
    inkTone = floor(inkTone * inkSteps + 0.5) / inkSteps;
    finalColor = vec3<f32>(pow(inkTone, 2.2));
    `;

    const baseSources = composeStylizedWaterSources({
      surface: glslSurface,
    });
    const wgslSources = composeStylizedWaterSources({
      surface: wgslSurface,
    });

    const sources: ShaderDefinition["sources"] = {};
    if (baseSources.glsl300) sources.glsl300 = baseSources.glsl300;
    if (baseSources.glsl100) sources.glsl100 = baseSources.glsl100;
    if (wgslSources.wgsl) sources.wgsl = wgslSources.wgsl;
    return sources;
  }
}
