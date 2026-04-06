/// src/math/Quaternion.ts

import { Vector3D } from "./Vector3D.js";
import { Matrix4 } from "./Matrix4.js";

/**
 * A class representing a quaternion for rotations.
 */
export class Quaternion {
  /** The x component. */
  public x: number;
  /** The y component. */
  public y: number;
  /** The z component. */
  public z: number;
  /** The w component. */
  public w: number;

  /**
   * Creates a new Quaternion.
   * @param x The x component.
   * @param y The y component.
   * @param z The z component.
   * @param w The w component.
   */
  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  /**
   * Sets the components of the quaternion.
   * @param x The x component.
   * @param y The y component.
   * @param z The z component.
   * @param w The w component.
   * @returns this
   */
  public set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  /**
   * Identity quaternion.
   * @returns this
   */
  public identity(): this {
    return this.set(0, 0, 0, 1);
  }

  /**
   * Multiplies this quaternion by another.
   * @param q The other quaternion.
   * @returns this
   */
  public multiply(q: Quaternion): this {
    const qax = this.x, qay = this.y, qaz = this.z, qaw = this.w;
    const qbx = q.x, qby = q.y, qbz = q.z, qbw = q.w;

    this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

    return this;
  }

  /**
   * Sets the quaternion from axis and angle.
   * @param axis The rotation axis (must be normalized).
   * @param angle The rotation angle in radians.
   * @returns this
   */
  public setFromAxisAngle(axis: Vector3D, angle: number): this {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);

    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);

    return this;
  }

  /**
   * Sets the quaternion from a rotation matrix.
   * @param m The rotation matrix.
   * @returns this
   */
  public setFromRotationMatrix(m: Matrix4): this {
    const te = m.data;
    const m11 = te[0]!, m12 = te[4]!, m13 = te[8]!;
    const m21 = te[1]!, m22 = te[5]!, m23 = te[9]!;
    const m31 = te[2]!, m32 = te[6]!, m33 = te[10]!;
    const trace = m11 + m22 + m33;

    if (0 < trace) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      this.w = 0.25 / s;
      this.x = (m32 - m23) * s;
      this.y = (m13 - m31) * s;
      this.z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
      this.w = (m32 - m23) / s;
      this.x = 0.25 * s;
      this.y = (m12 + m21) / s;
      this.z = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
      this.w = (m13 - m31) / s;
      this.x = (m12 + m21) / s;
      this.y = 0.25 * s;
      this.z = (m23 + m32) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
      this.w = (m21 - m12) / s;
      this.x = (m13 + m31) / s;
      this.y = (m23 + m32) / s;
      this.z = 0.25 * s;
    }

    return this;
  }

  /**
   * Calculates the length of the quaternion.
   * @returns The length.
   */
  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  /**
   * Normalizes the quaternion.
   * @returns this
   */
  public normalize(): this {
    let l = this.length();
    if (0 === l) {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.w = 1;
    } else {
      l = 1 / l;
      this.x *= l;
      this.y *= l;
      this.z *= l;
      this.w *= l;
    }
    return this;
  }

  /**
   * Clones the quaternion.
   * @returns A new Quaternion.
   */
  public clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }
}
