/// src/core/materials/LavaMaterial.ts
import { LiquidMaterial, LiquidMaterialOptions } from "./LiquidMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";

/**
 * Configuration options for LavaMaterial.
 */
export type LavaMaterialOptions = LiquidMaterialOptions;

/**
 * A highly specialized material for rendering animated, glowing lava.
 */
export class LavaMaterial extends LiquidMaterial {
  /**
   * Creates a new LavaMaterial.
   * @param options The configuration options.
   * @param type The material type (defaults to LAVA).
   */
  constructor(options: LavaMaterialOptions = {}, type: MaterialType = MaterialType.LAVA) {
    const defaults: LavaMaterialOptions = {
      color: new Color(1.5, 0.5, 0.0), // Over-bright for pseudo-bloom
      crustColor: new Color(0.1, 0.1, 0.1),
      flowSpeed: 1.0,
      noiseScale: 2.0,
      waveFrequency: 5.0,
      waveAmplitude: 0.05,
      ...options,
    };
    super(defaults, type);
  }
}
