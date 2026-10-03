import vertWGSL from "./shaders/StylizedWater.vert.wgsl?raw";
import fragWGSL from "./shaders/StylizedWater.frag.wgsl?raw";
import vertGLSL from "./shaders/StylizedWater.vert.glsl?raw";
import fragGLSL from "./shaders/StylizedWater.frag.glsl?raw";
import vertGLSL100 from "./shaders/StylizedWater.vert.glsl100?raw";
import fragGLSL100 from "./shaders/StylizedWater.frag.glsl100?raw";
import { LiquidWaveMaterial } from "./LiquidWaveMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import { RenderManifest, ShaderDefinition } from "../renderers/shaders/index.js";

export interface StylizedWaterMaterialOptions {
  shallowWaterColor?: Color;
  deepWaterColor?: Color;
  edgeColor?: Color;
  edgeSoftness?: number;
  speed?: number;
  wave1?: [number, number, number, number];
  wave2?: [number, number, number, number];
  wave3?: [number, number, number, number];
  refractionStrength?: number;
  waterAbsorption?: [number, number, number];
  foamColor?: Color;
  foamDistance?: number;
  foamCutoff?: number;
  foamNoiseScale?: number;
  foamNoiseSpeed?: number;
  /** Brightness of the toon caustic pattern on the ground, 0 = off. Default 0.6. */
  causticStrength?: number;
  /** Brightness of the toon sun-glint specular, 0 = off. Default 0.4. */
  specularStrength?: number;
  /** Style-ladder preset; explicit options override its values. Default "toon". */
  style?: StylizedWaterStyle;
}

/** Style ladder (low to high effect density). Only strengths differ; one shader, no forks. */
export type StylizedWaterStyle = "flat" | "toon" | "bold";

const STYLE_PRESETS: Record<
  StylizedWaterStyle,
  { causticStrength: number; specularStrength: number }
> = {
  flat: { causticStrength: 0.0, specularStrength: 0.0 },
  toon: { causticStrength: 0.6, specularStrength: 0.4 },
  bold: { causticStrength: 1.2, specularStrength: 1.2 }, // the original, hard-stacked look
};

/**
 * StylizedWaterMaterial implements a high-quality stylized 3D water surface
 * based on Gerstner waves, dual-noise toon shoreline/intersection foam, wave crest steepness foam,
 * and directional ground-reconstructed caustics projection. A toon preset on top of
 * {@link LiquidWaveMaterial}.
 */
export class StylizedWaterMaterial extends LiquidWaveMaterial {
  public causticStrength: number;
  public specularStrength: number;
  private readonly _colorWithSpecular: number[] = [0, 0, 0, 0];
  private readonly _deepWithCaustic: number[] = [0, 0, 0, 0];

  constructor(options: StylizedWaterMaterialOptions = {}) {
    const {
      shallowWaterColor = new Color(0.05, 0.45, 0.55),
      deepWaterColor = new Color(0.01, 0.1, 0.18),
      edgeColor = new Color(0.8, 1.0, 0.95),
      edgeSoftness = 0.35,
      speed = 1.0,
      wave1 = [1.0, 0.4, 0.08, 3.2],
      wave2 = [0.3, 0.9, 0.06, 2.0],
      wave3 = [-0.4, 0.6, 0.04, 1.3],
      refractionStrength = 0.03,
      waterAbsorption = [0.25, 0.08, 0.03],
      foamColor = new Color(1.0, 1.0, 1.0),
      foamDistance = 1.1,
      foamCutoff = 0.4,
      foamNoiseScale = 3.5,
      foamNoiseSpeed = 0.6,
      style = "toon",
    } = options;
    const preset = STYLE_PRESETS[style];
    const { causticStrength = preset.causticStrength, specularStrength = preset.specularStrength } =
      options;

    super(MaterialType.STYLIZED_WATER, {
      color: shallowWaterColor,
      deepWaterColor,
      edgeColor,
      edgeSoftness,
      speed,
      wave1,
      wave2,
      wave3,
      refractionStrength,
      waterAbsorption,
      foamColor,
      foamDistance,
      foamCutoff,
      foamNoiseScale,
      foamNoiseSpeed,
    });
    this.causticStrength = causticStrength;
    this.specularStrength = specularStrength;
  }

  /**
   * No free uniform slot is left (see LiquidWaveMaterial), but the alpha channels of u_color and
   * u_specColor are unused by the shader (output alpha is 1.0): they carry specularStrength and
   * causticStrength respectively.
   */
  public override getRenderManifest(): RenderManifest {
    const manifest = super.getRenderManifest();
    const props = manifest.properties as Record<string, unknown>;
    const c = this._colorWithSpecular;
    c[0] = this.color.r;
    c[1] = this.color.g;
    c[2] = this.color.b;
    c[3] = this.specularStrength;
    props["u_color"] = c;
    const d = this._deepWithCaustic;
    d[0] = this.deepWaterColor.r;
    d[1] = this.deepWaterColor.g;
    d[2] = this.deepWaterColor.b;
    d[3] = this.causticStrength;
    props["u_specColor"] = d;
    return manifest;
  }

  protected override _getLiquidWaveShaderSources(): ShaderDefinition["sources"] {
    return {
      glsl300: {
        vs: vertGLSL,
        fs: fragGLSL,
      },
      glsl100: {
        vs: vertGLSL100,
        fs: fragGLSL100,
      },
      wgsl: `${vertWGSL}\n[WGSL_PBR_MATH]\n${fragWGSL}`,
    };
  }
}
