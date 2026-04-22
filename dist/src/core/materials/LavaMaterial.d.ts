import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { MaterialType } from '../../enums/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
import { ShaderDefinition } from '../renderers/shaders/ShaderDefinition.js';
/**
 * Configuration options for LavaMaterial.
 */
export interface LavaMaterialOptions {
    /** The base glow color of the lava. Defaults to bright orange/yellow. */
    color?: Color | undefined;
    /** The color of the cooled crust. Defaults to dark grey. */
    crustColor?: Color | undefined;
    /** The speed of the lava flow animation. Defaults to 1.0. */
    flowSpeed?: number | undefined;
    /** The scale of the noise. Defaults to 2.0. */
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
    /** Frequency of the vertex waves. Defaults to 5.0. */
    waveFrequency?: number | undefined;
    /** Amplitude of the vertex waves. Defaults to 0.15. */
    waveAmplitude?: number | undefined;
}
/**
 * A highly specialized material for rendering animated, glowing lava or slime.
 */
export declare class LavaMaterial extends AbstractMaterial {
    /** The color of the cooled crust. */
    crustColor: Color;
    /** The speed of the lava flow. */
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
     * Creates a new LavaMaterial.
     * @param options The configuration options.
     * @param type The material type (defaults to LAVA).
     */
    constructor(options?: LavaMaterialOptions, type?: MaterialType);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
