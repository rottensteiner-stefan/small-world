import { AbstractMaterial } from './AbstractMaterial.js';
import { Color } from '../colors/index.js';
import { Texture } from '../textures/index.js';
import { RenderManifest, ShaderDefinition } from '../renderers/shaders/index.js';
/**
 * Material for rendering 2D sprites.
 */
export declare class SpriteMaterial extends AbstractMaterial {
    /** The texture to display on the sprite. */
    texture: Texture | undefined;
    /** Whether the sprite is transparent. Defaults to true. */
    transparent: boolean;
    /**
     * Creates a new SpriteMaterial.
     * @param options The texture for the sprite or a configuration object.
     */
    constructor(options?: Texture | {
        texture?: Texture | undefined;
        color?: Color | undefined;
        transparent?: boolean | undefined;
    });
    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
    /** @inheritdoc */
    getShaderDefinition(): ShaderDefinition;
}
