import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
export type WorldMaterialOptions = {
    color?: Color;
    diffuseMap?: Texture;
};
/**
 * A material that uses triplanar mapping to render seamless textures across world space coordinates.
 * Ideal for terrain, rocks, walls, and architectural structures.
 */
export declare class WorldMaterial extends AbstractMaterial {
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    constructor(options?: WorldMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
