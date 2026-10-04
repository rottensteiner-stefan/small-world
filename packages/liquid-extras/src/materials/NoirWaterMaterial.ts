import {
  Color,
  StylizedWaterMaterial,
  StylizedWaterMaterialOptions,
  composeStylizedWaterSources,
  ShaderDefinition,
} from "@small-world/engine";

export interface NoirWaterMaterialOptions extends StylizedWaterMaterialOptions {
  /** Ink posterization step count (default 4.0). */
  posterizeSteps?: number;
}

/**
 * NoirWaterMaterial demonstrates hook-based shader extension on top of
 * StylizedWaterMaterial without modifying or forking the engine core (ADR 0025).
 * It injects ink desaturation and comic-book posterization into the surface hook.
 */
export class NoirWaterMaterial extends StylizedWaterMaterial {
  public static readonly TYPE = "NoirWaterMaterial";

  constructor(options: NoirWaterMaterialOptions = {}) {
    const {
      shallowWaterColor = new Color(0.12, 0.16, 0.2),
      deepWaterColor = new Color(0.02, 0.03, 0.05),
      edgeColor = new Color(0.85, 0.88, 0.92),
      foamColor = new Color(0.95, 0.95, 0.95),
      causticStrength = 0.4,
      specularStrength = 0.8,
      rampSoftness = 0.1,
      washAmount = 0.3,
      lineDensity = 0.6,
      lineWidth = 2.0,
      foamSoftness = 0.04,
      glitterStrength = 0.2,
      styleId = 3.0,
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
        lineDensity,
        lineWidth,
        foamSoftness,
        glitterStrength,
        styleId,
        style: "custom",
        ...rest,
      },
      NoirWaterMaterial.TYPE,
    );
  }

  protected override _getLiquidWaveShaderSources(): ShaderDefinition["sources"] {
    const glslSurface = `
    // Noir comic-ink desaturation & posterization injected via [WATER_EXT_SURFACE]
    float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
    finalColor = mix(vec3(luma), finalColor, 0.15);
    finalColor = floor(finalColor * 4.0 + 0.5) / 4.0;
    `;

    const wgslSurface = `
    // Noir comic-ink desaturation & posterization injected via [WGSL_WATER_EXT_SURFACE]
    let luma = dot(finalColor, vec3<f32>(0.299, 0.587, 0.114));
    finalColor = mix(vec3<f32>(luma), finalColor, 0.15);
    finalColor = floor(finalColor * 4.0 + 0.5) / 4.0;
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
