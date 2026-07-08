import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
import { Vector2D } from '../../math/index.js';
/**
 * Configuration options for Lambert material.
 */
export interface LambertMaterialOptions {
    /** The base color of the material. Defaults to white. */
    color?: Color;
    /** The diffuse texture map. Defaults to undefined. */
    diffuseMap?: Texture | undefined;
    /** The normal texture map. Defaults to undefined. */
    normalMap?: Texture | undefined;
    /** Scale factor for the normal map to control strength and flip X/Y. Defaults to (1, 1). */
    normalScale?: Vector2D;
}
/**
 * A material that uses the Lambertian reflectance model.
 */
export declare class LambertMaterial extends AbstractMaterial {
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    /** The normal map texture. */
    normalMap: Texture | undefined;
    /** Scale factor for the normal map to control strength and flip X/Y. */
    normalScale: Vector2D;
    constructor(options?: LambertMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
