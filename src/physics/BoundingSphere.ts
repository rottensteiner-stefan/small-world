/// src/physics/BoundingSphere.ts

import { BoundingVolume, FrustumInterface } from "../interfaces/index.js";
import { Vector3D } from "../math/index.js";
import { BoundingType } from "../enums/index.js";
import { Collision } from "./Collision.js";
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

  /** @inheritdoc */
  public intersectsFrustum(frustum: FrustumInterface): boolean {
    const c: Vector3D = this.center;
    const r: number = this.radius;
    const p: Float32Array = frustum.planes;

    for (let i: number = 0; 6 > i; i++) {
      const idx: number = i * 4;
      const dist: number = p[idx]! * c.x + p[idx + 1]! * c.y + p[idx + 2]! * c.z + p[idx + 3]!;
      if (-r > dist) {
        return false;
      }
    }
    return true;
  }

  /** @inheritdoc */
  public intersectsVolume(other: BoundingVolume): boolean {
    return Collision.test(this, other);
  }
}
