import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
/**
 * Configuration options for FluidSurfaceMaterial.
 */
export interface FluidSurfaceMaterialOptions {
    /** The base color of the liquid. */
    color?: Color | undefined;
    /** The color of the edge intersection (foam/crust). */
    edgeColor?: Color | undefined;
    /** The speed of the liquid flow animation. */
    flowSpeed?: number | undefined;
    /** The distortion or noise scale. */
    distortion?: number | undefined;
    /** The viscosity (affects wave frequency/amplitude). */
    viscosity?: number | undefined;
    /** A noise texture map used to generate the flow. */
    noiseMap?: Texture | undefined;
    /** Normal map for surface detail. */
    normalMap?: Texture | undefined;
}
/**
 * A robust material for rendering fluid surfaces like water, lava, or slime with depth fade.
 */
export declare class FluidSurfaceMaterial extends AbstractMaterial {
    /** The base color of the fluid. */
    color: Color;
    /** The color of the edge intersection. */
    edgeColor: Color;
    /** The speed of the flow animation. */
    flowSpeed: number;
    /** The scale of the noise distortion. */
    distortion: number;
    /** The viscosity (controls wave properties). */
    viscosity: number;
    /** The current time/frame for animation. */
    time: number;
    /** The noise texture. */
    noiseMap: Texture | undefined;
    /** Optional normal map. */
    normalMap: Texture | undefined;
    /**
     * Creates a new FluidSurfaceMaterial.
     * @param options The configuration options.
     */
    constructor(options?: FluidSurfaceMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
