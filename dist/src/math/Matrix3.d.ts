/**
 * A class representing a 3x3 matrix.
 */
export declare class Matrix3 {
    /** The matrix data (column-major). */
    data: Float32Array;
    /**
     * Creates a new Matrix3.
     */
    constructor();
    /**
     * Sets the matrix to identity.
     * @returns this
     */
    identity(): this;
    /**
     * Sets the matrix from a 4x4 matrix (upper-left 3x3).
     * @param m The 4x4 matrix.
     * @returns this
     */
    setFromMatrix4(m: {
        data: Float32Array;
    }): this;
    /**
     * Calculates the normal matrix (transpose of the inverse of the upper-left 3x3 of a 4x4 matrix).
     * @param m The 4x4 matrix.
     * @returns this
     */
    getNormalMatrix(m: {
        data: Float32Array;
    }): this;
    /**
     * Multiplies two 3x3 matrices.
     * @param a The first matrix.
     * @param b The second matrix.
     * @param out The output matrix.
     */
    static multiply(a: Matrix3, b: Matrix3, out: Matrix3): void;
}
