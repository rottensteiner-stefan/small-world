import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { MaterialType } from '../../enums/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
import { ShaderDefinition } from '../renderers/shaders/ShaderDefinition.js';
/**
 * Configuration options for LiquidMaterial.
 */
export interface LiquidMaterialOptions {
    /** The base glow color of the liquid. */
    color?: Color | undefined;
    /** The color of the crust or darker parts. */
    crustColor?: Color | undefined;
    /** The speed of the liquid flow animation. */
    flowSpeed?: number | undefined;
    /** The scale of the noise. */
    noiseScale?: number | undefined;
    /** A noise texture map used to generate the crust and flow. */
    noiseMap?: Texture | undefined;
    /** Displacement map for vertex waves. */
    displacementMap?: Texture | undefined;
    /** Normal map for surface detail. */
    normalMap?: Texture | undefined;
    /** Specular map for shininess. */
    specularMap?: Texture | undefined;
    /** Ambient map for occlusion or base glow. */
    ambientMap?: Texture | undefined;
    /** Frequency of the vertex waves. */
    waveFrequency?: number | undefined;
    /** Amplitude of the vertex waves. */
    waveAmplitude?: number | undefined;
}
/**
 * A highly specialized material for rendering animated liquids like lava or slime.
 */
export declare abstract class LiquidMaterial extends AbstractMaterial {
    /** The color of the cooled crust or dark parts. */
    crustColor: Color;
    /** The speed of the flow animation. */
    flowSpeed: number;
    /** The scale of the noise pattern. */
    noiseScale: number;
    /** The current time/frame for animation. */
    time: number;
    /** The noise texture. */
    noiseMap: Texture | undefined;
    /** Optional displacement map. */
    displacementMap: Texture | undefined;
    /** Optional normal map. */
    normalMap: Texture | undefined;
    /** Optional specular map. */
    specularMap: Texture | undefined;
    /** Optional ambient map. */
    ambientMap: Texture | undefined;
    /** Wave frequency. */
    waveFrequency: number;
    /** Wave amplitude. */
    waveAmplitude: number;
    /**
     * Creates a new LiquidMaterial.
     * @param options The configuration options.
     * @param type The material type.
     */
    constructor(options: LiquidMaterialOptions | undefined, type: MaterialType);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
