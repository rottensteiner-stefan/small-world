import { AbstractMaterial } from './AbstractMaterial.js';
import { MaterialType } from '../../enums/index.js';
import { Color } from '../../core/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
export type BasicMaterialOptions = {
    color?: Color;
    diffuseMap?: Texture;
};
/**
 * A basic material that only uses a flat color.
 */
export declare class BasicMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The diffuse texture map. */
    diffuseMap: Texture | undefined;
    constructor(options?: BasicMaterialOptions);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
}
