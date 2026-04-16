/// src/physics/Collision.ts

import { BoundingBox, BoundingSphere } from "./index.js";
import { BoundingVolume } from "../interfaces/index.js";
import { Vector3D, MathPool } from "../math/index.js";
import { BoundingType } from "../enums/index.js";

/**
 * Static class for collision detection tests between different bounding volumes.
 */
export class Collision {
  /**
   * Performs a collision test between two bounding volumes.
   * Dispatches to specialized tests based on volume types.
   * @param a The first bounding volume.
   * @param b The second bounding volume.
   * @returns True if the volumes intersect.
   */
  public static test(a: BoundingVolume, b: BoundingVolume): boolean {
    const distSq: number = a.center.distanceToSq(b.center);
    const sumRad: number = a.getBroadRadius() + b.getBroadRadius();
    if (distSq > sumRad * sumRad) {
      return false;
    }
    if (BoundingType.SPHERE === a.type && BoundingType.SPHERE === b.type) {
      return this._sphereSphere(a as BoundingSphere, b as BoundingSphere);
    }
    if (BoundingType.BOX === a.type && BoundingType.BOX === b.type) {
      return this._boxBox(a as BoundingBox, b as BoundingBox);
    }
    if (BoundingType.SPHERE === a.type && BoundingType.BOX === b.type) {
      return this._sphereBox(a as BoundingSphere, b as BoundingBox);
    }
    if (BoundingType.BOX === a.type && BoundingType.SPHERE === b.type) {
      return this._sphereBox(b as BoundingSphere, a as BoundingBox);
    }
    return false;
  }

  /**
   * Tests intersection between two spheres.
   * @param s1 The first sphere.
   * @param s2 The second sphere.
   * @returns True if they intersect.
   * @private
   */
  private static _sphereSphere(s1: BoundingSphere, s2: BoundingSphere): boolean {
    const d2: number = s1.center.distanceToSq(s2.center);
    const r2: number = (s1.radius + s2.radius) * (s1.radius + s2.radius);
    return d2 <= r2;
  }

  /**
   * Tests intersection between two axis-aligned bounding boxes.
   * @param b1 The first box.
   * @param b2 The second box.
   * @returns True if they intersect.
   * @private
   */
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

  /**
   * Tests intersection between a sphere and an axis-aligned bounding box.
   * @param s The sphere.
   * @param b The box.
   * @returns True if they intersect.
   * @private
   */
  private static _sphereBox(s: BoundingSphere, b: BoundingBox): boolean {
    const closest: Vector3D = MathPool.acquireVector().set(
      Math.max(b.min.x, Math.min(s.center.x, b.max.x)),
      Math.max(b.min.y, Math.min(s.center.y, b.max.y)),
      Math.max(b.min.z, Math.min(s.center.z, b.max.z)),
    );
    const result: boolean = closest.distanceToSq(s.center) <= s.radius * s.radius;
    MathPool.releaseVector(closest);
    return result;
  }
}
