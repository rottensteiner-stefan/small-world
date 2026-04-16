/**
 * Interface representing a mathematical vector.
 */
export interface Vector {
    /**
     * Calculates the length of the vector.
     * @returns The length.
     */
    length(): number;
    /**
     * Calculates the squared length of the vector.
     * @returns The squared length.
     */
    lengthSq(): number;
    /**
     * Normalizes the vector to a length of 1.
     * @returns This vector instance.
     */
    normalize(): Vector;
    /**
     * Scales the vector by a scalar value.
     * @param s The scalar to scale by.
     * @returns This vector instance.
     */
    scale(s: number): Vector;
}
