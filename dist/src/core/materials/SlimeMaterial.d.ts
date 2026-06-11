import { LiquidMaterial, LiquidMaterialOptions } from './LiquidMaterial.js';
/**
 * Configuration options for SlimeMaterial.
 */
export type SlimeMaterialOptions = LiquidMaterialOptions;
/**
 * Specialized animated toxic slime material.
 * Inherits from LiquidMaterial but with distinct radioactive defaults and flatter waves.
 */
export declare class SlimeMaterial extends LiquidMaterial {
    /**
     * Creates a new SlimeMaterial.
     * @param options The configuration options.
     */
    constructor(options?: SlimeMaterialOptions);
}
