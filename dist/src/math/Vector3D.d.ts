import { Vector } from '../interfaces/Vector.js';
import { Matrix4 } from './Matrix4.js';
/**
 * A class representing a 3D vector.
 * Data is stored as individual properties for fast access in JS engines.
 */
export declare class Vector3D implements Vector {
    x: number;
    y: number;
    z: number;
    /** Static zero vector to avoid unnecessary allocations. Should be treated as read-only. */
    static readonly ZERO: Vector3D;
    /**
     * Creates a new Vector3D.
     * @param x The x component. Defaults to 0.
     * @param y The y component. Defaults to 0.
     * @param z The z component. Defaults to 0.
     */
    constructor(x?: number, y?: number, z?: number);
    /**
     * Sets the components of the vector.
     * @param x The x component.
     * @param y The y component. Defaults to x.
     * @param z The z component. Defaults to y.
     * @returns this
     */
    set(x: number, y?: number, z?: number): this;
    /**
     * Adds another vector to this one.
     * @param v The vector to add.
     * @returns this
     */
    add(v: Vector3D): this;
    /**
     * Subtracts another vector from this one.
     * @param v The vector to subtract.
     * @returns this
     */
    sub(v: Vector3D): this;
    /**
     * Scales the vector by a scalar value.
     * @param s The scalar factor.
     * @returns this
     */
    scale(s: number): this;
    /**
     * Calculates the dot product of this vector and another.
     * @param v The other vector.
     * @returns The dot product.
     */
    dot(v: Vector3D): number;
    /**
     * Adds a scalar value to all components.
     * @param s The scalar to add.
     * @returns this
     */
    addScalar(s: number): this;
    /**
     * Multiplies the vector components by another vector (component-wise).
     * @param v The vector to multiply by.
     * @returns this
     */
    multiply(v: Vector3D): this;
    /**
     * Divides the vector by a scalar.
     * @param s The scalar to divide by.
     * @returns this
     */
    divideScalar(s: number): this;
    /**
     * Calculates the cross product of this vector and another vector.
     * @param v The other vector.
     * @returns this
     */
    cross(v: Vector3D): this;
    /**
     * Calculates the cross product of two vectors and stores the result in this vector.
     * @param a The first vector.
     * @param b The second vector.
     * @returns this
     */
    crossVectors(a: Vector3D, b: Vector3D): this;
    /**
     * Calculates the squared length of the vector.
     * @returns The squared length.
     */
    lengthSq(): number;
    /**
     * Calculates the Euclidean length of the vector.
     * @returns The length.
     */
    length(): number;
    /**
     * Calculates the squared distance to another vector.
     * @param v The other vector.
     * @returns The squared distance.
     */
    distanceToSq(v: Vector3D): number;
    /**
     * Calculates the Euclidean distance to another vector.
     * @param v The other vector.
     * @returns The distance.
     */
    distanceTo(v: Vector3D): number;
    /**
     * Copies components from another vector.
     * @param v The vector to copy from.
     * @returns this
     */
    copyFrom(v: Vector3D): this;
    /**
     * Clones the vector into a new instance.
     * @returns A new Vector3D.
     */
    clone(): Vector3D;
    /**
     * Clamps the vector components between min and max vectors.
     * @param min The minimum vector.
     * @param max The maximum vector.
     * @returns this
     */
    clamp(min: Vector3D, max: Vector3D): this;
    /**
     * Normalizes the vector to a unit length of 1.
     * @returns this
     */
    normalize(): this;
    /**
     * Transforms the direction of this vector with a matrix.
     * This ignores the translation component of the matrix.
     * @param m The transformation matrix.
     * @returns this
     */
    transformDirection(m: Matrix4): this;
}
