/// src/physics/BoundingBox.ts

import { BoundingVolume, FrustumInterface } from "../interfaces/index.js";
import { Vector3D } from "../math/Vector3D.js";
import { BoundingType } from "../enums/index.js";
import { Collision } from "./Collision.js";

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
   * Creates a BoundingBox that encapsulates all provided vertices.
   */
  public static fromVertices(v: Float32Array): BoundingBox {
    let minX = Infinity; let minY = Infinity; let minZ = Infinity;
    let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;

    for (let i = 0; i < v.length; i += 3) {
      const x = v[i]!; const y = v[i+1]!; const z = v[i+2]!;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    return new BoundingBox(
        new Vector3D(minX, minY, minZ),
        new Vector3D(maxX, maxY, maxZ)
    );
  }

  /**
   * Checks if this bounding box contains a point.
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

  /** @inheritdoc */
  public intersectsFrustum(frustum: FrustumInterface): boolean {
    const p: Float32Array = frustum.planes;

    for (let i: number = 0; 6 > i; i++) {
      const idx: number = i * 4;
      const p0 = p[idx]!;
      const p1 = p[idx + 1]!;
      const p2 = p[idx + 2]!;
      const p3 = p[idx + 3]!;

      const px: number = 0 <= p0 ? this.max.x : this.min.x;
      const py: number = 0 <= p1 ? this.max.y : this.min.y;
      const pz: number = 0 <= p2 ? this.max.z : this.min.z;

      const dist: number = p0 * px + p1 * py + p2 * pz + p3;

      if (0 > dist) {
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
