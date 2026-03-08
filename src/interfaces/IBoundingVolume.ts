import { Vector3D } from "../math/Vector3D.js";
export enum BoundingType { SPHERE, BOX }
export interface IBoundingVolume {
  type: BoundingType;
  center: Vector3D;
  getBroadRadius(): number;
}
