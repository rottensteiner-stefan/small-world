import { AbstractMaterial } from './AbstractMaterial.js';
import { MaterialType } from '../../enums/index.js';
import { Color } from '../../core/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
import { ShaderDefinition } from '../renderers/shaders/ShaderDefinition.js';
export type WorldMaterialOptions = {
    color?: Color;
    diffuseMap?: Texture;
};
/**
 * A material that uses triplanar mapping to render seamless textures across world space coordinates.
 * Ideal for terrain, rocks, walls, and architectural structures.
 */
export declare class WorldMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    constructor(options?: WorldMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
