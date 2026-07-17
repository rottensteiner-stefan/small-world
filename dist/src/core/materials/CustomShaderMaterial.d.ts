import { AbstractMaterial } from './AbstractMaterial.js';
import { CullMode } from '../../enums/index.js';
import { Texture, CubeTexture } from '../textures/index.js';
import { RenderManifest, ShaderDefinition, ShaderLayout } from '../renderers/shaders/index.js';
export interface CustomShaderMaterialOptions {
    /** Shader sources for different APIs. Provide at least one matching the active renderer. */
    sources: {
        wgsl?: string;
        glsl300?: {
            vs: string;
            fs: string;
        };
        glsl100?: {
            vs: string;
            fs: string;
        };
    };
    /** The uniform and texture layout expected by this custom shader. */
    layout: ShaderLayout;
    /** Initial uniform property values mapped to names defined in the layout. */
    properties?: Record<string, unknown>;
    /** Initial textures mapped to names defined in the layout. */
    textures?: Record<string, Texture | CubeTexture | undefined>;
    /** Whether the material is transparent. Defaults to false. */
    transparent?: boolean;
    /** The culling mode. Defaults to BACK. */
    cullMode?: CullMode;
    /** Whether the material writes to the depth buffer. Defaults to true. */
    depthWrite?: boolean;
    /** Whether the material performs depth testing. Defaults to true. */
    depthTest?: boolean;
}
/**
 * A highly flexible material that allows developers to write entirely custom
 * shader code (WGSL and GLSL) without modifying the core engine chunks.
 * Perfect for very specific visual effects.
 */
export declare class CustomShaderMaterial extends AbstractMaterial {
    sources: CustomShaderMaterialOptions["sources"];
    layout: ShaderLayout;
    properties: Record<string, unknown>;
    textures: Record<string, Texture | CubeTexture | undefined>;
    constructor(options: CustomShaderMaterialOptions);
    /**
     * Helper to set a uniform property dynamically.
     */
    setProperty(name: string, value: unknown): void;
    /**
     * Helper to set a texture dynamically.
     */
    setTexture(name: string, texture: Texture | CubeTexture | undefined): void;
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
