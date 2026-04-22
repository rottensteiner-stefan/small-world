import { LavaMaterial, LavaMaterialOptions } from './LavaMaterial.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
import { ShaderDefinition } from '../renderers/shaders/ShaderDefinition.js';
/**
 * Configuration options for SlimeMaterial.
 */
export interface SlimeMaterialOptions extends LavaMaterialOptions {
    /** Displacement map for vertex waves. */
    displacementMap?: Texture;
    /** Normal map for surface detail. */
    normalMap?: Texture;
}
/**
 * Specialized animated toxic slime material.
 * Inherits from LavaMaterial but with distinct radioactive defaults and extra map support.
 */
export declare class SlimeMaterial extends LavaMaterial {
    /** Optional displacement map for smoother waves. */
    displacementMap: Texture | undefined;
    /** Optional normal map for lighting details. */
    normalMap: Texture | undefined;
    /**
     * Creates a new SlimeMaterial.
     * @param options The configuration options.
     */
    constructor(options?: SlimeMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
