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
    color?: Color;
    /** The color of the cooled crust. Defaults to dark grey. */
    crustColor?: Color;
    /** The speed of the lava flow animation. Defaults to 1.0. */
    flowSpeed?: number;
    /** The scale of the noise. Defaults to 2.0. */
    noiseScale?: number;
    /** A noise texture map used to generate the crust and flow. */
    noiseMap?: Texture | undefined;
}
/**
 * A highly specialized material for rendering animated, glowing lava.
 * Requires a noise map to generate the flowing crust effect on the GPU.
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
