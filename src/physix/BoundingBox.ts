import { Collision } from "./Collision.js";
import { BoundingSphere } from "./BoundingSphere.js";
import { BoundingVolume, FrustumInterface } from "../interfaces/index.js";
import { Vector3D, MathPool, Matrix4 } from "../math/index.js";
import { BoundingType } from "../enums/index.js";

/**
 * Represents an axis-aligned bounding box (AABB).
 */
export class BoundingBox implements BoundingVolume {
  /** @inheritdoc */
  public type: BoundingType = BoundingType.BOX;

  /** The center of the box. */
  public center: Vector3D = new Vector3D();

  /**
   * Creates a new BoundingBox.
   * @param min The minimum coordinates.
   * @param max The maximum coordinates.
   */
  constructor(
    public min: Vector3D = new Vector3D(Infinity, Infinity, Infinity),
    public max: Vector3D = new Vector3D(-Infinity, -Infinity, -Infinity),
  ) {
    this.center.copyFrom(min).add(max).scale(0.5);
  }

  /**
   * Creates a new BoundingBox that encapsulates all provided vertices.
   * @param vertices The raw vertex data [x, y, z, ...].
   * @returns A new BoundingBox instance.
   */
  public static fromVertices(vertices: ArrayLike<number>): BoundingBox {
    const min: Vector3D = new Vector3D(Infinity, Infinity, Infinity);
    const max: Vector3D = new Vector3D(-Infinity, -Infinity, -Infinity);

    for (let i: number = 0; i < vertices.length; i += 3) {
      const x: number = vertices[i]!;
      const y: number = vertices[i + 1]!;
      const z: number = vertices[i + 2]!;

      if (x < min.x) {
        min.x = x;
      }
      if (y < min.y) {
        min.y = y;
      }
      if (z < min.z) {
        min.z = z;
      }

      if (x > max.x) {
        max.x = x;
      }
      if (y > max.y) {
        max.y = y;
      }
      if (z > max.z) {
        max.z = z;
      }
    }

    return new BoundingBox(min, max);
  }

  /** @inheritdoc */
  public getBroadRadius(): number {
    return this.min.distanceTo(this.max) * 0.5;
  }

  /**
   * Checks if a point is inside the box.
   * @param point The point to check.
   * @returns True if inside.
   */
  public containsPoint(point: Vector3D): boolean {
    return (
      point.x >= this.min.x &&
      point.x <= this.max.x &&
      point.y >= this.min.y &&
      point.y <= this.max.y &&
      point.z >= this.min.z &&
      point.z <= this.max.z
    );
  }

  /**
   * Checks if another box intersects with this one.
   * @param other The other box.
   * @returns True if intersecting.
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

  /**
   * Checks if another box is entirely contained within this one.
   * @param other The other box.
   * @returns True if entirely contained.
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
   * Checks if a sphere is entirely contained within this box.
   * @param other The sphere.
   * @returns True if entirely contained.
   */
  public containsSphere(other: BoundingSphere): boolean {
    return (
      this.min.x <= other.center.x - other.radius &&
      this.max.x >= other.center.x + other.radius &&
      this.min.y <= other.center.y - other.radius &&
      this.max.y >= other.center.y + other.radius &&
      this.min.z <= other.center.z - other.radius &&
      this.max.z >= other.center.z + other.radius
    );
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

  /** @inheritdoc */
  public containsVolume(other: BoundingVolume): boolean {
    if (BoundingType.BOX === other.type) {
      return this.containsBox(other as BoundingBox);
    }
    if (BoundingType.SPHERE === other.type) {
      return this.containsSphere(other as BoundingSphere);
    }
    return false;
  }

  /** @inheritdoc */
  public transform(matrix: Matrix4): void {
    const min = this.min;
    const max = this.max;

    // Corners of the box
    const points = [
      MathPool.acquireVector().set(min.x, min.y, min.z),
      MathPool.acquireVector().set(min.x, min.y, max.z),
      MathPool.acquireVector().set(min.x, max.y, min.z),
      MathPool.acquireVector().set(min.x, max.y, max.z),
      MathPool.acquireVector().set(max.x, min.y, min.z),
      MathPool.acquireVector().set(max.x, min.y, max.z),
      MathPool.acquireVector().set(max.x, max.y, min.z),
      MathPool.acquireVector().set(max.x, max.y, max.z),
    ];

    min.set(Infinity, Infinity, Infinity);
    max.set(-Infinity, -Infinity, -Infinity);

    for (const p of points) {
      matrix.transformVector(p);
      min.min(p);
      max.max(p);
      MathPool.releaseVector(p);
    }

    this.center.copyFrom(min).add(max).scale(0.5);
  }
}
