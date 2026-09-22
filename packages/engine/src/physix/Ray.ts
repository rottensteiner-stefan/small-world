import { BoundingBox } from "./BoundingBox.js";
import { BoundingSphere } from "./BoundingSphere.js";
import type { OBB } from "./OBB.js";
import { Vector3D } from "../math/index.js";

/**
 * Represents a mathematical ray in 3D space.
 */
export class Ray {
  /**
   * Creates a new Ray.
   * @param origin The origin point of the ray.
   * @param direction The normalized direction vector of the ray.
   */
  constructor(
    public origin: Vector3D = new Vector3D(),
    public direction: Vector3D = new Vector3D(0, 0, -1),
  ) {}

  /**
   * Sets the ray's origin and direction.
   * @param origin The new origin.
   * @param direction The new normalized direction.
   * @returns This ray instance.
   */
  public set(origin: Vector3D, direction: Vector3D): this {
    this.origin.copyFrom(origin);
    this.direction.copyFrom(direction);
    return this;
  }

  /**
   * Computes the point along the ray at a given distance.
   * @param t The distance along the ray.
   * @param target Optional target vector.
   * @returns The computed point.
   */
  public at(t: number, target: Vector3D = new Vector3D()): Vector3D {
    return target.copyFrom(this.direction).scale(t).add(this.origin);
  }

  /**
   * Tests whether this ray intersects the given AABB.
   * Uses the slab method.
   * @param box The axis-aligned bounding box.
   * @returns The distance `t` to the intersection, or -1 if no intersection.
   */
  public intersectsBox(box: BoundingBox): number {
    let tmin: number = -Infinity;
    let tmax: number = Infinity;

    const dirX: number = this.direction.x;
    const dirY: number = this.direction.y;
    const dirZ: number = this.direction.z;

    const oriX: number = this.origin.x;
    const oriY: number = this.origin.y;
    const oriZ: number = this.origin.z;

    const invDirX: number = 1.0 / (0 === dirX ? 1e-10 : dirX);
    const invDirY: number = 1.0 / (0 === dirY ? 1e-10 : dirY);
    const invDirZ: number = 1.0 / (0 === dirZ ? 1e-10 : dirZ);

    let t1: number = (box.min.x - oriX) * invDirX;
    let t2: number = (box.max.x - oriX) * invDirX;

    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));

    t1 = (box.min.y - oriY) * invDirY;
    t2 = (box.max.y - oriY) * invDirY;

    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));

    t1 = (box.min.z - oriZ) * invDirZ;
    t2 = (box.max.z - oriZ) * invDirZ;

    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));

    if (tmax >= tmin && 0 <= tmax) {
      return 0 <= tmin ? tmin : tmax;
    }

    return -1;
  }

  /**
   * Tests whether this ray intersects the given bounding sphere.
   * @param sphere The bounding sphere.
   * @returns The distance `t` to the nearest intersection, or -1 if no intersection.
   */
  public intersectsSphere(sphere: BoundingSphere): number {
    const ocX = this.origin.x - sphere.center.x;
    const ocY = this.origin.y - sphere.center.y;
    const ocZ = this.origin.z - sphere.center.z;

    const dirX = this.direction.x;
    const dirY = this.direction.y;
    const dirZ = this.direction.z;

    const a = dirX * dirX + dirY * dirY + dirZ * dirZ;
    const b = 2 * (ocX * dirX + ocY * dirY + ocZ * dirZ);
    const c = ocX * ocX + ocY * ocY + ocZ * ocZ - sphere.radius * sphere.radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0 || 0 === a) return -1;

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDiscriminant) / (2 * a);
    const t2 = (-b + sqrtDiscriminant) / (2 * a);

    if (0 <= t1) return t1;
    if (0 <= t2) return t2;
    return -1;
  }

  /**
   * Tests whether this ray intersects the given OBB.
   * Uses the slab method projected onto the OBB's local axes.
   * @param obb The oriented bounding box.
   * @returns The distance `t` to the nearest intersection, or -1 if no intersection.
   */
  public intersectsOBB(obb: OBB): number {
    let tmin = -Infinity;
    let tmax = Infinity;

    const pX = this.origin.x - obb.center.x;
    const pY = this.origin.y - obb.center.y;
    const pZ = this.origin.z - obb.center.z;

    // Axis 0 (X)
    {
      const a = obb.axes[0];
      const e = a.x * this.direction.x + a.y * this.direction.y + a.z * this.direction.z;
      const f = a.x * pX + a.y * pY + a.z * pZ;
      const hi = obb.halfExtents.x;
      if (Math.abs(e) > 1e-10) {
        let t1 = (-f - hi) / e;
        let t2 = (-f + hi) / e;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax || tmax < 0) return -1;
      } else if (-f - hi > 0 || -f + hi < 0) {
        return -1;
      }
    }

    // Axis 1 (Y)
    {
      const a = obb.axes[1];
      const e = a.x * this.direction.x + a.y * this.direction.y + a.z * this.direction.z;
      const f = a.x * pX + a.y * pY + a.z * pZ;
      const hi = obb.halfExtents.y;
      if (Math.abs(e) > 1e-10) {
        let t1 = (-f - hi) / e;
        let t2 = (-f + hi) / e;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax || tmax < 0) return -1;
      } else if (-f - hi > 0 || -f + hi < 0) {
        return -1;
      }
    }

    // Axis 2 (Z)
    {
      const a = obb.axes[2];
      const e = a.x * this.direction.x + a.y * this.direction.y + a.z * this.direction.z;
      const f = a.x * pX + a.y * pY + a.z * pZ;
      const hi = obb.halfExtents.z;
      if (Math.abs(e) > 1e-10) {
        let t1 = (-f - hi) / e;
        let t2 = (-f + hi) / e;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax || tmax < 0) return -1;
      } else if (-f - hi > 0 || -f + hi < 0) {
        return -1;
      }
    }

    if (tmax >= tmin && tmax >= 0) {
      return tmin >= 0 ? tmin : tmax;
    }

    return -1;
  }
}
