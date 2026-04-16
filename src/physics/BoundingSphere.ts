/// src/physics/BoundingSphere.ts

import { BoundingVolume } from "../interfaces/index.js";
import { Vector3D } from "../math/index.js";
import { BoundingType } from "../enums/index.js";
/**
 * Represents a bounding sphere in 3D space.
 */
export class BoundingSphere implements BoundingVolume {
  /** @inheritdoc */
  public type: BoundingType = BoundingType.SPHERE;

  /**
   * Creates a new BoundingSphere.
   * @param center The center position of the sphere.
   * @param radius The radius of the sphere.
   */
  constructor(
    public center: Vector3D,
    public radius: number,
  ) {}

  /** @inheritdoc */
  public getBroadRadius(): number {
    return this.radius;
  }
}
