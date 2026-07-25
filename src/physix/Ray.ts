import { BoundingBox } from "./BoundingBox.js";
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
}
