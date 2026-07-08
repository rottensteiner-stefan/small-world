import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
/**
 * Configuration options for BasicMaterial.
 */
export type BasicMaterialOptions = {
    color?: Color;
    diffuseMap?: Texture;
};
/**
 * A basic material that only uses a flat color.
 */
export declare class BasicMaterial extends AbstractMaterial {
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    constructor(options?: BasicMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
