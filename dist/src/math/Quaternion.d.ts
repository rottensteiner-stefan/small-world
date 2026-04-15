import { Vector3D } from './Vector3D.js';
import { Matrix4 } from './Matrix4.js';
/**
 * A class representing a quaternion for rotations.
 */
export declare class Quaternion {
    /** The x component. */
    x: number;
    /** The y component. */
    y: number;
    /** The z component. */
    z: number;
    /** The w component. */
    w: number;
    /**
     * Creates a new Quaternion.
     * @param x The x component.
     * @param y The y component.
     * @param z The z component.
     * @param w The w component.
     */
    constructor(x?: number, y?: number, z?: number, w?: number);
    /**
     * Sets the components of the quaternion.
     * @param x The x component.
     * @param y The y component.
     * @param z The z component.
     * @param w The w component.
     * @returns this
     */
    set(x: number, y: number, z: number, w: number): this;
    /**
     * Identity quaternion.
     * @returns this
     */
    identity(): this;
    /**
     * Multiplies this quaternion by another.
     * @param q The other quaternion.
     * @returns this
     */
    multiply(q: Quaternion): this;
    /**
     * Sets the quaternion from axis and angle.
     * @param axis The rotation axis (must be normalized).
     * @param angle The rotation angle in radians.
     * @returns this
     */
    setFromAxisAngle(axis: Vector3D, angle: number): this;
    /**
     * Sets the quaternion from a rotation matrix.
     * @param m The rotation matrix.
     * @returns this
     */
    setFromRotationMatrix(m: Matrix4): this;
    /**
     * Calculates the length of the quaternion.
     * @returns The length.
     */
    length(): number;
    /**
     * Normalizes the quaternion.
     * @returns this
     */
    normalize(): this;
    /**
     * Clones the quaternion.
     * @returns A new Quaternion.
     */
    clone(): Quaternion;
}
