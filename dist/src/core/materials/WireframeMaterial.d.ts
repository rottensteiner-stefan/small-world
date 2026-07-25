import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
/**
 * A material for wireframe rendering.
 */
export declare class WireframeMaterial extends AbstractMaterial {
    wireframeMode: "structural" | "triangles";
    constructor(color?: Color, wireframeMode?: "structural" | "triangles");
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
