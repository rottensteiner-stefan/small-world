/**
 * A class representing a 3x3 matrix.
 * Used for 2D transformations or normal matrices.
 */
export declare class Matrix3 {
    /** The matrix data in column-major order. */
    data: Float32Array;
    /**
     * Creates a new Matrix3 and initializes it to the identity matrix.
     */
    constructor();
    /**
     * Sets the matrix to the identity matrix.
     * @returns this
     */
    identity(): this;
    /**
     * Sets the matrix from the upper-left 3x3 part of a 4x4 matrix.
     * @param m The source 4x4 matrix.
     * @returns this
     */
    setFromMatrix4(m: {
        data: Float32Array;
    }): this;
    /**
     * Calculates the normal matrix (transpose of the inverse of the upper-left 3x3 of a 4x4 matrix).
     * Used for transforming normals correctly when non-uniform scaling is present.
     * @param m The source 4x4 matrix.
     * @returns this
     */
    getNormalMatrix(m: {
        data: Float32Array;
    }): this;
    /**
     * Multiplies two 3x3 matrices and stores the result in out.
     * @param a The first matrix.
     * @param b The second matrix.
     * @param out The output matrix.
     */
    static multiply(a: Matrix3, b: Matrix3, out: Matrix3): void;
}
