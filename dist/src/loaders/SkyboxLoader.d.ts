import { AbstractLoader } from './AbstractLoader.js';
import { CubeTexture } from '../core/textures/index.js';
import { LoaderOptions } from '../interfaces/index.js';
/**
 * Loader for cube map skybox textures from a single cross-layout image.
 */
export declare class SkyboxLoader extends AbstractLoader<CubeTexture> {
    /**
     * Creates a new SkyboxLoader.
     * @param options Optional configuration options.
     */
    constructor(options?: LoaderOptions);
    /** @inheritdoc */
    load(url: string): Promise<CubeTexture>;
}
