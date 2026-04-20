import { AbstractMaterial } from './AbstractMaterial.js';
import { MaterialType } from '../../enums/index.js';
import { Color } from '../colors/index.js';
import { RenderManifest } from '../renderers/shaders/RenderManifest.js';
import { ShaderDefinition } from '../renderers/shaders/ShaderDefinition.js';
/**
 * A material for wireframe rendering.
 */
export declare class WireframeMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    constructor(color?: Color);
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
