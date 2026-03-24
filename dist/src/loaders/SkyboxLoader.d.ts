import { CubeTexture } from '../core/textures/CubeTexture.js';
import { AbstractLoader } from './AbstractLoader.js';
export declare class SkyboxLoader extends AbstractLoader<CubeTexture> {
    load(url: string): Promise<CubeTexture>;
}
