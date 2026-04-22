import { LavaMaterial, LavaMaterialOptions } from './LavaMaterial.js';
/**
 * Configuration options for SlimeMaterial.
 */
export interface SlimeMaterialOptions extends LavaMaterialOptions {
}
/**
 * Specialized animated toxic slime material.
 * Inherits from LavaMaterial but with distinct radioactive defaults and flatter waves.
 */
export declare class SlimeMaterial extends LavaMaterial {
    /**
     * Creates a new SlimeMaterial.
     * @param options The configuration options.
     */
    constructor(options?: SlimeMaterialOptions);
}
