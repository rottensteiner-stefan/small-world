import { Matrix4 } from './Matrix4.js';
import { BoundingVolume } from '../interfaces/index.js';
export declare class Frustum {
    planes: Float32Array;
    setFromMatrix(m: Matrix4): void;
    intersectsVolume(volume: BoundingVolume): boolean;
}
