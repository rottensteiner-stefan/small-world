/// src/math/Vector3D.ts

import { Vector } from "../interfaces/Vector.js";
import { Matrix4 } from "./Matrix4.js";

/**
 * A 3D vector class.
 */
export class Vector3D implements Vector {
  /**
   * The x component.
   */
  public x: number;

  /**
   * The y component.
   */
  public y: number;

  /**
   * The z component.
   */
  public z: number;

  /**
   * Creates a new Vector3D.
   * @param x The x component.
   * @param y The y component.
   * @param z The z component.
   */
  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Sets the components of the vector.
   * @param x The x component.
   * @param y The y component.
   * @param z The z component.
   * @returns this
   */
  public set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /**
   * Adds another vector to this one.
   * @param v The vector to add.
   * @returns this
   */
  public add(v: Vector3D): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  /**
   * Subtracts another vector from this one.
   * @param v The vector to subtract.
   * @returns this
   */
  public sub(v: Vector3D): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  /**
   * Scales the vector by a scalar value.
   * @param s The scalar to scale by.
   * @returns this
   */
  public scale(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  /**
   * Calculates the dot product of this vector and another.
   * @param v The other vector.
   * @returns The dot product.
   */
  public dot(v: Vector3D): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /**
   * Calculates the squared length of the vector.
   * @returns The squared length.
   */
  public lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /**
   * Calculates the length of the vector.
   * @returns The length.
   */
  public length(): number {
    return Math.sqrt(this.lengthSq());
  }

  /**
   * Calculates the squared distance to another vector.
   * @param v The other vector.
   * @returns The squared distance.
   */
  public distanceToSq(v: Vector3D): number {
    const dx: number = this.x - v.x;
    const dy: number = this.y - v.y;
    const dz: number = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Calculates the distance to another vector.
   * @param v The other vector.
   * @returns The distance.
   */
  public distanceTo(v: Vector3D): number {
    return Math.sqrt(this.distanceToSq(v));
  }

  /**
   * Copies components from another vector.
   * @param v The vector to copy from.
   * @returns this
   */
  public copyFrom(v: Vector3D): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  /**
   * Clones the vector.
   * @returns A new Vector3D with the same components.
   */
  public clone(): Vector3D {
    return new Vector3D(this.x, this.y, this.z);
  }

  /**
   * Normalizes the vector to a length of 1.
   * @returns this
   */
  public normalize(): this {
    const len: number = this.length();

    if (0.000001 < len) {
      const invLen: number = 1 / len;
      this.x *= invLen;
      this.y *= invLen;
      this.z *= invLen;
    } else {
      this.x = 0;
      this.y = 0;
      this.z = 0;
    }

    return this;
  }

  /**
   * Transforms the direction of this vector with a matrix.
   * This ignores the translation component of the matrix.
   * @param m The transformation matrix.
   * @returns this
   */
  public transformDirection(m: Matrix4): this {
    const d: Float32Array = m.data;
    const x: number = this.x;
    const y: number = this.y;
    const z: number = this.z;

    this.x = (d[0] ?? 0) * x + (d[4] ?? 0) * y + (d[8] ?? 0) * z;
    this.y = (d[1] ?? 0) * x + (d[5] ?? 0) * y + (d[9] ?? 0) * z;
    this.z = (d[2] ?? 0) * x + (d[6] ?? 0) * y + (d[10] ?? 0) * z;

    return this.normalize();
  }
}
