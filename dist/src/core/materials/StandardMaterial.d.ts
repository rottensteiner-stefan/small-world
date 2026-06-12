import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
import { ShaderDefinition } from '../renderers/shaders/ShaderDefinition.js';
import { Vector2D } from '../../math/index.js';
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
    /** Scale factor for the normal map to control strength and flip X/Y. Defaults to (1, 1). */
    normalScale?: Vector2D;
    /** The metallic texture map. */
    metallicMap?: Texture | undefined;
    /** The roughness texture map. */
    roughnessMap?: Texture | undefined;
    /** The emissive color. Defaults to black. */
    emissiveColor?: Color;
    /** The emissive texture map. */
    emissiveMap?: Texture | undefined;
    /** The alpha mask texture map. */
    alphaMap?: Texture | undefined;
    /** The intensity of the emissive light. Defaults to 1.0. */
    emissiveIntensity?: number;
    /** Whether the material is transparent. Defaults to false. */
    transparent?: boolean;
    /** Alpha cutoff threshold. Fragments with alpha below this value are discarded. Defaults to 0.0. */
    alphaTest?: number;
}
/**
 * A physically based rendering (PBR) material using the Metallic-Roughness workflow.
 */
export declare class StandardMaterial extends AbstractMaterial {
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
    /** Scale factor for the normal map to control strength and flip X/Y. */
    normalScale: Vector2D;
    /** The metallic map texture. */
    metallicMap: Texture | undefined;
    /** The roughness map texture. */
    roughnessMap: Texture | undefined;
    /** The emissive color. */
    emissiveColor: Color;
    /** The emissive map texture. */
    emissiveMap: Texture | undefined;
    /** The alpha mask texture map. */
    alphaMap: Texture | undefined;
    /** The intensity of the emissive glow. */
    emissiveIntensity: number;
    /** Alpha cutoff threshold. */
    alphaTest: number;
    /**
     * Creates a new StandardMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options?: StandardMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
