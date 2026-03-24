import { BoundingVolume } from '../interfaces/index.js';
import { Vector3D } from '../math/index.js';
export declare class BoundingSphere implements BoundingVolume {
    center: Vector3D;
    radius: number;
    type: 0;
    constructor(center: Vector3D, radius: number);
    getBroadRadius(): number;
}
