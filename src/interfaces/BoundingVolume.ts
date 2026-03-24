/// src/interfaces/BoundingVolume.ts
import { Vector3D } from "../math/index.js";
import { BoundingType } from "../enums/index.js"; // To check if this enum exists

export interface BoundingVolume {
  type: BoundingType;
  center: Vector3D;

  getBroadRadius(): number;
}
