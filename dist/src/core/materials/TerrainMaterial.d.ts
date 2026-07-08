import { AbstractMaterial } from './AbstractMaterial.js';
import { Texture } from '../textures/index.js';
import { Color } from '../colors/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
/**
 * Configuration options for terrain material.
 */
export interface TerrainMaterialOptions {
    /** The base color. Defaults to white. */
    color?: Color;
    /** The shininess factor. Defaults to 10. */
    shininess?: number;
    /** Sand biome texture map. Defaults to undefined. */
    sandMap?: Texture | undefined;
    /** Grass biome texture map. Defaults to undefined. */
    grassMap?: Texture | undefined;
    /** Rock biome texture map. Defaults to undefined. */
    rockMap?: Texture | undefined;
    /** Snow biome texture map. Defaults to undefined. */
    snowMap?: Texture | undefined;
    /** Texture repetition factors. Defaults to [20.0, 20.0]. */
    texRepeat?: [number, number];
    /** Thresholds for biome transitions. Defaults to [2.0, 15.0, 25.0, 2.0]. */
    thresholds?: [number, number, number, number];
}
/**
 * Material specifically for terrain rendering with splatmapping.
 */
export declare class TerrainMaterial extends AbstractMaterial {
    /** The shininess factor. */
    shininess: number;
    /** Sand biome texture map. */
    sandMap: Texture | undefined;
    /** Grass biome texture map. */
    grassMap: Texture | undefined;
    /** Rock biome texture map. */
    rockMap: Texture | undefined;
    /** Snow biome texture map. */
    snowMap: Texture | undefined;
    /** Texture repetition factors. */
    texRepeat: [number, number];
    /** Thresholds for biome transitions: [SandToGrass, GrassToRock, RockToSnow, TransitionSoftness]. */
    thresholds: [number, number, number, number];
    /**
     * Creates a new TerrainMaterial.
     * @param options The configuration options for the material.
     */
    constructor(options?: TerrainMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
