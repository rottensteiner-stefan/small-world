import vertWGSL from "./shaders/StylizedWater.vert.wgsl?raw";
import fragWGSL from "./shaders/StylizedWater.frag.wgsl?raw";
import vertGLSL from "./shaders/StylizedWater.vert.glsl?raw";
import fragGLSL from "./shaders/StylizedWater.frag.glsl?raw";
import vertGLSL100 from "./shaders/StylizedWater.vert.glsl100?raw";
import fragGLSL100 from "./shaders/StylizedWater.frag.glsl100?raw";
import { LiquidWaveMaterial } from "./LiquidWaveMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import { ShaderDefinition } from "../renderers/shaders/index.js";

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
}

/**
 * StylizedWaterMaterial implements a high-quality stylized 3D water surface
 * based on Gerstner waves, dual-noise toon shoreline/intersection foam, wave crest steepness foam,
 * and directional ground-reconstructed caustics projection. A toon preset on top of
 * {@link LiquidWaveMaterial}.
 */
export class StylizedWaterMaterial extends LiquidWaveMaterial {
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
    } = options;

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
