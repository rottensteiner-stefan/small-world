import { AbstractMaterial } from './index.js';
import { CubeTexture } from '../textures/index.js';
export declare class SkyboxMaterial extends AbstractMaterial {
    readonly type: "SkyboxMaterial";
    cubeMap: CubeTexture | null;
}
