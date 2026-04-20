/// src/physics/Collision.ts

import { BoundingBox, BoundingSphere } from "./index.js";
import { BoundingVolume } from "../interfaces/index.js";
import { Vector3D, MathPool } from "../math/index.js";
import { BoundingType } from "../enums/index.js";

/**
 * Static class for collision detection and resolution.
 */
export class Collision {
  /**
   * Performs a collision test between two bounding volumes.
   */
  public static test(a: BoundingVolume, b: BoundingVolume): boolean {
    const distSq: number = a.center.distanceToSq(b.center);
    const sumRad: number = a.getBroadRadius() + b.getBroadRadius();
    if (distSq > sumRad * sumRad) return false;

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
   * Resolves collision between a sphere and a box, returning a correction vector.
   * @param s The sphere (e.g. Camera).
   * @param b The box (e.g. Wall).
   * @param result Vector to store the correction.
   * @returns True if collision was resolved.
   */
  public static resolveSphereBox(s: BoundingSphere, b: BoundingBox, result: Vector3D): boolean {
    const closest = MathPool.acquireVector().set(
      Math.max(b.min.x, Math.min(s.center.x, b.max.x)),
      Math.max(b.min.y, Math.min(s.center.y, b.max.y)),
      Math.max(b.min.z, Math.min(s.center.z, b.max.z)),
    );

    const diff = MathPool.acquireVector().copyFrom(s.center).sub(closest);
    const distSq = diff.lengthSq();

    if (distSq >= s.radius * s.radius) {
      MathPool.releaseVector(closest);
      MathPool.releaseVector(diff);
      return false;
    }

    const dist = Math.sqrt(distSq);
    if (dist < 0.0001) {
        // Sphere center is exactly on the edge or inside. Push out along the axis of least penetration.
        const dx1 = s.center.x - b.min.x; const dx2 = b.max.x - s.center.x;
        const dy1 = s.center.y - b.min.y; const dy2 = b.max.y - s.center.y;
        const dz1 = s.center.z - b.min.z; const dz2 = b.max.z - s.center.z;
        const min = Math.min(dx1, dx2, dy1, dy2, dz1, dz2);
        if (min === dx1) result.set(-s.radius - dx1, 0, 0);
        else if (min === dx2) result.set(s.radius + dx2, 0, 0);
        else if (min === dy1) result.set(0, -s.radius - dy1, 0);
        else if (min === dy2) result.set(0, s.radius + dy2, 0);
        else if (min === dz1) result.set(0, 0, -s.radius - dz1);
        else result.set(0, 0, s.radius + dz2);
    } else {
        const overlap = s.radius - dist;
        result.copyFrom(diff).normalize().scale(overlap);
    }

    MathPool.releaseVector(closest);
    MathPool.releaseVector(diff);
    return true;
  }

  private static _sphereSphere(s1: BoundingSphere, s2: BoundingSphere): boolean {
    const d2: number = s1.center.distanceToSq(s2.center);
    const r2: number = (s1.radius + s2.radius) * (s1.radius + s2.radius);
    return d2 <= r2;
  }

  private static _boxBox(b1: BoundingBox, b2: BoundingBox): boolean {
    return (b1.min.x <= b2.max.x && b1.max.x >= b2.min.x && b1.min.y <= b2.max.y && b1.max.y >= b2.min.y && b1.min.z <= b2.max.z && b1.max.z >= b2.min.z);
  }

  private static _sphereBox(s: BoundingSphere, b: BoundingBox): boolean {
    const closest = MathPool.acquireVector().set(
      Math.max(b.min.x, Math.min(s.center.x, b.max.x)),
      Math.max(b.min.y, Math.min(s.center.y, b.max.y)),
      Math.max(b.min.z, Math.min(s.center.z, b.max.z)),
    );
    const result: boolean = closest.distanceToSq(s.center) <= s.radius * s.radius;
    MathPool.releaseVector(closest);
    return result;
  }
}
