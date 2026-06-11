import { CubeTexture } from './textures/index.js';
import { Object3D } from './Object3D.js';
/**
 * Configuration options for the Skydome.
 */
export interface SkyboxOptions {
    /** The name of the object. Defaults to "Skydome". */
    name?: string;
    /** The size of the skybox cube. */
    size?: number;
    /** An array of paths to the cube map textures or a CubeTexture instance. */
    source: string[] | CubeTexture;
}
/**
 * A skybox that surrounds the scene.
 */
export declare class Skybox extends Object3D {
    constructor(options: SkyboxOptions);
}
