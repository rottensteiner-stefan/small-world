import { BoundingVolume } from '../interfaces/index.js';
import { Vector3D } from '../math/Vector3D.js';
export declare class BoundingBox implements BoundingVolume {
    min: Vector3D;
    max: Vector3D;
    type: 1;
    broadRadius: number;
    constructor(min: Vector3D, max: Vector3D);
    get center(): Vector3D;
    getBroadRadius(): number;
}
