import { Vector3D } from "../math/Vector3D.js";

export const BoundingType = {
  SPHERE: 0,
  BOX: 1,
} as const;

export type BoundingType = (typeof BoundingType)[keyof typeof BoundingType];

export interface IBoundingVolume {
  type: BoundingType;
  center: Vector3D;
  getBroadRadius(): number;
}
