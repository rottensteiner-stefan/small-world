import { CubeTexture } from './textures/index.js';
import { Object3D } from './Object3D.js';
export declare class Skybox extends Object3D {
    constructor(source: string[] | CubeTexture, size?: number);
}
