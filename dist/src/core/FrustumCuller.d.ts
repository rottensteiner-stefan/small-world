import { Matrix4 } from '../math/Matrix4.js';
import { Scene } from './Scene.js';
export declare class FrustumCuller {
    private static frustum;
    static cull(scene: Scene, vpMatrix: Matrix4): number;
}
