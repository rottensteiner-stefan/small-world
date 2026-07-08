import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
export interface GlassMaterialOptions {
    color?: Color;
    metallic?: number;
    roughness?: number;
    ior?: number;
    thickness?: number;
    transmission?: number;
    normalMap?: Texture | undefined;
}
export declare class GlassMaterial extends AbstractMaterial {
    color: Color;
    metallic: number;
    roughness: number;
    ior: number;
    thickness: number;
    transmission: number;
    normalMap?: Texture;
    constructor(options?: GlassMaterialOptions);
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
