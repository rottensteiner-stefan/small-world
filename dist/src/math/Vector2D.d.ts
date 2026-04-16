import { Vector } from '../interfaces/Vector.js';
/**
 * A class representing a 2D vector.
 * Data is stored as individual properties for fast access in JS engines.
 */
export declare class Vector2D implements Vector {
    x: number;
    y: number;
    /**
     * Creates a new Vector2D.
     * @param x The x component. Defaults to 0.
     * @param y The y component. Defaults to 0.
     */
    constructor(x?: number, y?: number);
    /**
     * Sets the components of the vector.
     * @param x The x component.
     * @param y The y component.
     * @returns this
     */
    set(x: number, y: number): this;
    /**
     * Adds another vector to this one.
     * @param v The vector to add.
     * @returns this
     */
    add(v: Vector2D): this;
    /**
     * Adds a scalar to this vector.
     * @param s The scalar to add.
     * @returns this
     */
    addScalar(s: number): this;
    /**
     * Multiplies this vector by another (component-wise).
     * @param v The other vector.
     * @returns this
     */
    multiply(v: Vector2D): this;
    /**
     * Divides this vector by a scalar.
     * @param s The scalar to divide by.
     * @returns this
     */
    divideScalar(s: number): this;
    /**
     * Subtracts another vector from this one.
     * @param v The vector to subtract.
     * @returns this
     */
    sub(v: Vector2D): this;
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
    dot(v: Vector2D): number;
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
    distanceToSq(v: Vector2D): number;
    /**
     * Calculates the Euclidean distance to another vector.
     * @param v The other vector.
     * @returns The distance.
     */
    distanceTo(v: Vector2D): number;
    /**
     * Clones the vector into a new instance.
     * @returns A new Vector2D.
     */
    clone(): Vector2D;
    /**
     * Normalizes the vector to a unit length of 1.
     * @returns this
     */
    normalize(): this;
}
