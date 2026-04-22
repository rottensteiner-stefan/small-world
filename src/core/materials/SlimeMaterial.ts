/// src/core/materials/SlimeMaterial.ts

import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import { LiquidMaterial, LiquidMaterialOptions } from "./LiquidMaterial.js";

/**
 * Configuration options for SlimeMaterial.
 */
export type SlimeMaterialOptions = LiquidMaterialOptions;

/**
 * Specialized animated toxic slime material.
 * Inherits from LiquidMaterial but with distinct radioactive defaults and flatter waves.
 */
export class SlimeMaterial extends LiquidMaterial {
  /**
   * Creates a new SlimeMaterial.
   * @param options The configuration options.
   */
  constructor(options: SlimeMaterialOptions = {}) {
    // radioactive defaults
    const defaults: SlimeMaterialOptions = {
      color: new Color(0.0, 1.2, 0.0), // Less bright than lava default
      crustColor: new Color(0.05, 0.2, 0.05),
      flowSpeed: 0.1, // Slower than lava
      noiseScale: 3.0,
      waveFrequency: 3.0, // Flatter/wider waves
      waveAmplitude: 0.05, // Flatter waves
      ...options,
    };
    super(defaults, MaterialType.SLIME);
  }
}
