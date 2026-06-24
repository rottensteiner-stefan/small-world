import { AbstractMaterial } from './AbstractMaterial.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
import { ShaderDefinition } from '../renderers/shaders/ShaderDefinition.js';
/**
 * Configuration options for DepthMaterial.
 */
export type DepthMaterialOptions = {
    diffuseMap?: Texture;
    alphaTest?: number;
};
/**
 * A specialized material for rendering into a shadow map (depth buffer).
 * It only evaluates alpha testing if a diffuse texture is provided, otherwise it is extremely fast.
 */
export declare class DepthMaterial extends AbstractMaterial {
    /** The diffuse texture map used exclusively for alpha testing. */
    diffuseMap: Texture | undefined;
    /** Alpha cutoff threshold. */
    alphaTest: number;
    constructor(options?: DepthMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
