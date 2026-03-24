/// src/physics/Collision.ts
import { BoundingBox, BoundingSphere } from "./index.js";
import { BoundingVolume } from "../interfaces/index.js";
import { Vector3D } from "../math/index.js";
import { BoundingType } from "../enums/index.js";

/**
 * Static class for collision detection tests.
 */
export class Collision {
  /**
   * Performs a collision test between two bounding volumes.
   * @param a The first volume.
   * @param b The second volume.
   * @returns True if the volumes intersect.
   */
  public static test(a: BoundingVolume, b: BoundingVolume): boolean {
    const distSq: number = a.center.distanceToSq(b.center);
    const sumRad: number = a.getBroadRadius() + b.getBroadRadius();
    if (distSq > sumRad * sumRad) {
      return false;
    }
    if (a.type === BoundingType.SPHERE && b.type === BoundingType.SPHERE) {
      return this._sphereSphere(a as BoundingSphere, b as BoundingSphere);
    }
    if (a.type === BoundingType.BOX && b.type === BoundingType.BOX) {
      return this._boxBox(a as BoundingBox, b as BoundingBox);
    }
    if (a.type === BoundingType.SPHERE && b.type === BoundingType.BOX) {
      return this._sphereBox(a as BoundingSphere, b as BoundingBox);
    }
    if (a.type === BoundingType.BOX && b.type === BoundingType.SPHERE) {
      return this._sphereBox(b as BoundingSphere, a as BoundingBox);
    }
    return false;
  }

  private static _sphereSphere(s1: BoundingSphere, s2: BoundingSphere): boolean {
    const d2: number = s1.center.distanceToSq(s2.center);
    const r2: number = (s1.radius + s2.radius) * (s1.radius + s2.radius);
    return d2 <= r2;
  }

  private static _boxBox(b1: BoundingBox, b2: BoundingBox): boolean {
    return (
      b1.min.x <= b2.max.x &&
      b1.max.x >= b2.min.x &&
      b1.min.y <= b2.max.y &&
      b1.max.y >= b2.min.y &&
      b1.min.z <= b2.max.z &&
      b1.max.z >= b2.min.z
    );
  }

  private static _sphereBox(s: BoundingSphere, b: BoundingBox): boolean {
    const closest: Vector3D = new Vector3D(
      Math.max(b.min.x, Math.min(s.center.x, b.max.x)),
      Math.max(b.min.y, Math.min(s.center.y, b.max.y)),
      Math.max(b.min.z, Math.min(s.center.z, b.max.z)),
    );
    return closest.distanceToSq(s.center) <= s.radius * s.radius;
  }
}
