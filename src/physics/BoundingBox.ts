/// src/physics/BoundingBox.ts

import { BoundingVolume } from "../interfaces/index.js";
import { Vector3D } from "../math/Vector3D.js";
import { BoundingType } from "../enums/index.js";

/**
 * Represents an axis-aligned bounding box (AABB) in 3D space.
 */
export class BoundingBox implements BoundingVolume {
  /** @inheritdoc */
  public type: BoundingType = BoundingType.BOX;

  /** The broad radius for coarse intersection tests. */
  public broadRadius: number;

  /** Internal storage for the center point. */
  private _center: Vector3D;

  /**
   * Creates a new BoundingBox.
   * @param min The minimum coordinates (lower-left-back).
   * @param max The maximum coordinates (upper-right-front).
   */
  constructor(
    public min: Vector3D,
    public max: Vector3D,
  ) {
    const sizeX: number = max.x - min.x;
    const sizeY: number = max.y - min.y;
    const sizeZ: number = max.z - min.z;
    this.broadRadius = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ) * 0.5;
    this._center = new Vector3D(
      (min.x + max.x) * 0.5,
      (min.y + max.y) * 0.5,
      (min.z + max.z) * 0.5,
    );
  }

  /**
   * Checks if this bounding box contains a point.
   * @param point The point to check.
   * @returns True if the point is inside the bounding box.
   */
  public containsPoint(point: Vector3D): boolean {
    return (
      this.min.x <= point.x &&
      this.max.x >= point.x &&
      this.min.y <= point.y &&
      this.max.y >= point.y &&
      this.min.z <= point.z &&
      this.max.z >= point.z
    );
  }

  /**
   * Checks if this bounding box contains another bounding box.
   * @param other The other bounding box.
   * @returns True if the other bounding box is completely inside this one.
   */
  public containsBox(other: BoundingBox): boolean {
    return (
      this.min.x <= other.min.x &&
      this.max.x >= other.max.x &&
      this.min.y <= other.min.y &&
      this.max.y >= other.max.y &&
      this.min.z <= other.min.z &&
      this.max.z >= other.max.z
    );
  }

  /**
   * Checks if this bounding box intersects with another bounding box.
   * @param other The other bounding box.
   * @returns True if the bounding boxes intersect.
   */
  public intersectsBox(other: BoundingBox): boolean {
    return (
      this.min.x <= other.max.x &&
      this.max.x >= other.min.x &&
      this.min.y <= other.max.y &&
      this.max.y >= other.min.y &&
      this.min.z <= other.max.z &&
      this.max.z >= other.min.z
    );
  }

  /** @inheritdoc */
  public get center(): Vector3D {
    this._center.x = (this.min.x + this.max.x) * 0.5;
    this._center.y = (this.min.y + this.max.y) * 0.5;
    this._center.z = (this.min.z + this.max.z) * 0.5;
    return this._center;
  }

  /** @inheritdoc */
  public getBroadRadius(): number {
    return this.broadRadius;
  }
}
