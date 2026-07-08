import { LiquidMaterial, LiquidMaterialOptions } from './LiquidMaterial.js';
import { MaterialType } from '../../enums/index.js';
/**
 * Configuration options for LavaMaterial.
 */
export type LavaMaterialOptions = LiquidMaterialOptions;
/**
 * A highly specialized material for rendering animated, glowing lava.
 */
export declare class LavaMaterial extends LiquidMaterial {
    /**
     * Creates a new LavaMaterial.
     * @param options The configuration options.
     * @param type The material type (defaults to LAVA).
     */
    constructor(options?: LavaMaterialOptions, type?: MaterialType);
}
