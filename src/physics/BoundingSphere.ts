/// src/physics/BoundingSphere.ts
import { BoundingVolume } from "../interfaces/index.js";
import { Vector3D } from "../math/index.js";
import { BoundingType } from "../enums/index.js";
export class BoundingSphere implements BoundingVolume {
  public type = BoundingType.SPHERE;
  constructor(
    public center: Vector3D,
    public radius: number,
  ) {}
  public getBroadRadius(): number {
    return this.radius;
  }
}
