/// src/physix/Collision.ts
import { BoundingBox } from "./BoundingBox.js";
import { BoundingSphere } from "./BoundingSphere.js";
import { OBB } from "./OBB.js";
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

    // Use specific logic based on types to avoid infinite recursion
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
    if (BoundingType.OBB === a.type && BoundingType.OBB === b.type) {
      return this._obbObb(a as unknown as OBB, b as unknown as OBB);
    }
    // Implement other permutations (OBB vs BOX, OBB vs Sphere) as needed
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

    const dist: number = Math.sqrt(distSq);
    if (0.0001 > dist) {
      // Sphere center is exactly on the edge or inside. Push out along the axis of least penetration.
      const dx1: number = s.center.x - b.min.x;
      const dx2: number = b.max.x - s.center.x;
      const dy1: number = s.center.y - b.min.y;
      const dy2: number = b.max.y - s.center.y;
      const dz1: number = s.center.z - b.min.z;
      const dz2: number = b.max.z - s.center.z;
      const min: number = Math.min(dx1, dx2, dy1, dy2, dz1, dz2);
      if (min === dx1) {
        result.set(-s.radius - dx1, 0, 0);
      } else if (min === dx2) {
        result.set(s.radius + dx2, 0, 0);
      } else if (min === dy1) {
        result.set(0, -s.radius - dy1, 0);
      } else if (min === dy2) {
        result.set(0, s.radius + dy2, 0);
      } else if (min === dz1) {
        result.set(0, 0, -s.radius - dz1);
      } else {
        result.set(0, 0, s.radius + dz2);
      }
    } else {
      const overlap: number = s.radius - dist;
      result.copyFrom(diff).normalize().scale(overlap);
    }

    MathPool.releaseVector(closest);
    MathPool.releaseVector(diff);
    return true;
  }

  /**
   * Resolves collision between two spheres, returning a correction vector.
   * @param s1 The first sphere.
   * @param s2 The second sphere.
   * @param result Vector to store the correction (points from s2 to s1).
   * @returns True if collision was resolved.
   */
  public static resolveSphereSphere(
    s1: BoundingSphere,
    s2: BoundingSphere,
    result: Vector3D,
  ): boolean {
    const diff = MathPool.acquireVector().copyFrom(s1.center).sub(s2.center);
    const distSq = diff.lengthSq();
    const sumRad = s1.radius + s2.radius;

    if (distSq >= sumRad * sumRad) {
      MathPool.releaseVector(diff);
      return false;
    }

    const dist = Math.sqrt(distSq);
    if (dist < 0.0001) {
      // Exactly same center, push up
      result.set(0, 1, 0).scale(sumRad);
    } else {
      const overlap = sumRad - dist;
      result.copyFrom(diff).normalize().scale(overlap);
    }
    MathPool.releaseVector(diff);
    return true;
  }

  /**
   * Resolves collision between two axis-aligned boxes, returning a correction vector.
   * @param b1 The first box.
   * @param b2 The second box.
   * @param result Vector to store the correction (points from b2 to b1, along the axis of least penetration).
   * @returns True if collision was resolved.
   */
  public static resolveBoxBox(b1: BoundingBox, b2: BoundingBox, result: Vector3D): boolean {
    const overlapX = Math.min(b1.max.x, b2.max.x) - Math.max(b1.min.x, b2.min.x);
    if (overlapX <= 0) return false;
    const overlapY = Math.min(b1.max.y, b2.max.y) - Math.max(b1.min.y, b2.min.y);
    if (overlapY <= 0) return false;
    const overlapZ = Math.min(b1.max.z, b2.max.z) - Math.max(b1.min.z, b2.min.z);
    if (overlapZ <= 0) return false;

    // Push out along the single axis of least penetration.
    if (overlapX <= overlapY && overlapX <= overlapZ) {
      const dir = b1.center.x - b2.center.x >= 0 ? 1 : -1;
      result.set(overlapX * dir, 0, 0);
    } else if (overlapY <= overlapX && overlapY <= overlapZ) {
      const dir = b1.center.y - b2.center.y >= 0 ? 1 : -1;
      result.set(0, overlapY * dir, 0);
    } else {
      const dir = b1.center.z - b2.center.z >= 0 ? 1 : -1;
      result.set(0, 0, overlapZ * dir);
    }

    return true;
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

  /**
   * Performs the Separating Axis Theorem (SAT) test for two OBBs.
   * Returns true if they intersect.
   */
  private static _obbObb(a: OBB, b: OBB): boolean {
    const t = MathPool.acquireVector().copyFrom(b.center).sub(a.center);

    // We have 15 potential separating axes:
    // 3 from A, 3 from B, 9 cross products of A and B
    for (let i = 0; i < 3; i++) {
      if (!this._testAxis(a.axes[i]!, a, b, t)) return false;
    }
    for (let i = 0; i < 3; i++) {
      if (!this._testAxis(b.axes[i]!, a, b, t)) return false;
    }

    const crossAxis = MathPool.acquireVector();
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        crossAxis.copyFrom(a.axes[i]!).cross(b.axes[j]!);
        // If axes are parallel, cross product is nearly zero, skip
        if (crossAxis.lengthSq() > 0.0001) {
          crossAxis.normalize();
          if (!this._testAxis(crossAxis, a, b, t)) {
            MathPool.releaseVector(crossAxis);
            MathPool.releaseVector(t);
            return false;
          }
        }
      }
    }

    MathPool.releaseVector(crossAxis);
    MathPool.releaseVector(t);
    return true;
  }

  /**
   * Tests a single axis for SAT. Returns false if a separating gap is found.
   */
  private static _testAxis(axis: Vector3D, a: OBB, b: OBB, t: Vector3D): boolean {
    // Project OBB A's half-extents onto the axis
    const rA =
      a.halfExtents.x * Math.abs(axis.dot(a.axes[0]!)) +
      a.halfExtents.y * Math.abs(axis.dot(a.axes[1]!)) +
      a.halfExtents.z * Math.abs(axis.dot(a.axes[2]!));

    // Project OBB B's half-extents onto the axis
    const rB =
      b.halfExtents.x * Math.abs(axis.dot(b.axes[0]!)) +
      b.halfExtents.y * Math.abs(axis.dot(b.axes[1]!)) +
      b.halfExtents.z * Math.abs(axis.dot(b.axes[2]!));

    // Project the distance vector between centers onto the axis
    const dist = Math.abs(t.dot(axis));

    // If the distance is greater than the sum of projected radii, we have a gap!
    return dist <= rA + rB;
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
