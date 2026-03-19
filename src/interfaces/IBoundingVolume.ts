/// src/interfaces/IBoundingVolume.ts
import {Vector3D} from "../math/index.js";
import {BoundingType} from "../enums/index.js";

export interface IBoundingVolume {
    type: BoundingType;
    center: Vector3D;

    getBroadRadius(): number;
}
