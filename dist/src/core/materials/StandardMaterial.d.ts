import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { MaterialType } from '../../enums/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
/**
 * Configuration options for StandardMaterial.
 */
export interface StandardMaterialOptions {
    /** The base color of the material. Defaults to white. */
    color?: Color;
    /** Metallic factor (0 to 1). Defaults to 0. */
    metallic?: number;
    /** Roughness factor (0 to 1). Defaults to 0.5. */
    roughness?: number;
    /** Ambient occlusion factor (0 to 1). Defaults to 1. */
    ao?: number;
    /** The diffuse texture map. */
    diffuseMap?: Texture | undefined;
    /** The normal map texture. */
    normalMap?: Texture | undefined;
}
/**
 * A physically based rendering (PBR) material using the Metallic-Roughness workflow.
 */
export declare class StandardMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** Metallic factor (0 to 1). */
    metallic: number;
    /** Roughness factor (0 to 1). */
    roughness: number;
    /** Ambient occlusion factor (0 to 1). */
    ao: number;
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    /** The normal map texture. */
    normalMap: Texture | undefined;
    /**
     * Creates a new StandardMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options?: StandardMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
}
