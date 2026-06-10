import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
import { ShaderDefinition } from '../renderers/shaders/ShaderDefinition.js';
import { Vector2D } from '../../math/index.js';
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
    /** Scale factor for the normal map to control strength and flip X/Y. Defaults to (1, 1). */
    normalScale?: Vector2D;
    /** The specular map texture. Defaults to undefined. */
    specularMap?: Texture | undefined;
    /** Whether the material is transparent. Defaults to false. */
    transparent?: boolean;
    /** Alpha cutoff threshold. Fragments with alpha below this value are discarded. Defaults to 0.0. */
    alphaTest?: number;
}
/**
 * Material that implements the Phong reflection model.
 */
export declare class PhongMaterial extends AbstractMaterial {
    /** The specular reflection color. */
    specularColor: Color;
    /** The shininess factor. */
    shininess: number;
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    /** The normal map texture. */
    normalMap: Texture | undefined;
    /** Scale factor for the normal map to control strength and flip X/Y. */
    normalScale: Vector2D;
    /** The specular map texture. */
    specularMap: Texture | undefined;
    /** Alpha cutoff threshold. */
    alphaTest: number;
    /**
     * Creates a new PhongMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options?: PhongMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
