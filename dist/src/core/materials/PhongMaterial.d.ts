import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { MaterialType } from '../../enums/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
/**
 * Configuration options for Phong material.
 */
export interface PhongMaterialOptions {
    /** The base color of the material. Defaults to white. */
    color?: Color;
    /** The specular reflection color. Defaults to white. */
    specularColor?: Color;
    /** The shininess factor. Defaults to 32.0. */
    shininess?: number;
    /** The diffuse texture map. Defaults to undefined. */
    diffuseMap?: Texture | undefined;
    /** The normal map texture. Defaults to undefined. */
    normalMap?: Texture | undefined;
    /** The specular map texture. Defaults to undefined. */
    specularMap?: Texture | undefined;
}
/**
 * Material that implements the Phong reflection model.
 */
export declare class PhongMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The specular reflection color. */
    specularColor: Color;
    /** The shininess factor. */
    shininess: number;
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    /** The normal map texture. */
    normalMap: Texture | undefined;
    /** The specular map texture. */
    specularMap: Texture | undefined;
    /**
     * Creates a new PhongMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options?: PhongMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
}
