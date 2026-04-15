import { AbstractMaterial } from './AbstractMaterial.js';
import { MaterialType } from '../../enums/index.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
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
}
/**
 * A material that uses the Lambertian reflectance model.
 */
export declare class LambertMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    /** The normal texture map. */
    normalMap: Texture | undefined;
    constructor(options?: LambertMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
}
