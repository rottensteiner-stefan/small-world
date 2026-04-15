import { Vector3D } from '../math/index.js';
import { BoundingType } from '../enums/index.js';
export interface BoundingVolume {
    type: BoundingType;
    center: Vector3D;
    getBroadRadius(): number;
}
