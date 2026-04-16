import {AbstractMaterial} from './AbstractMaterial.js';
import {CubeTexture} from '../textures/index.js';
import {MaterialType} from '../../enums/index.js';
import {Color} from '../colors/Color.js';
import {RenderManifest} from '../renderers/shaders/RenderManifest.js';

/**
 * Configuration options for skybox material.
 */
export interface SkyboxMaterialOptions {
    /** The base color. Defaults to white. */
    color?: Color;
    /** The cube map texture. Defaults to undefined. */
    cubeMap?: CubeTexture | undefined;
}

/**
 * A material for skyboxes.
 */
export declare class SkyboxMaterial extends AbstractMaterial {
    /** @inheritdoc */
    readonly type: MaterialType;
    /** The cube map texture. */
    cubeMap: CubeTexture | undefined;

    /**
     * Creates a new SkyboxMaterial.
     * @param options The configuration options.
     */
    constructor(options?: SkyboxMaterialOptions);

    /** @inheritdoc */
    getRenderManifest(): RenderManifest;
}
