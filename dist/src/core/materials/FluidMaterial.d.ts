import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
import { ShaderDefinition } from '../renderers/shaders/ShaderDefinition.js';
/**
 * Material for rendering fluid particles.
 */
export declare class FluidMaterial extends AbstractMaterial {
    /** The color of the particles. */
    particleColor: Color;
    /** The size of the particles in pixels (for point rendering). */
    particleSize: number;
    constructor(color?: Color, size?: number);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
