import { IBoundingVolume, BoundingType } from "../interfaces/IBoundingVolume.js";
import { Vector3D } from "../math/Vector3D.js";

export class BoundingSphere implements IBoundingVolume {
  public type = BoundingType.SPHERE;
  constructor(
    public center: Vector3D,
    public radius: number,
  ) {}
  public getBroadRadius(): number {
    return this.radius;
  }
}
