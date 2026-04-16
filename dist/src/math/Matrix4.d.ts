import { Vector3D } from './Vector3D.js';
/**
 * A 4x4 matrix class for 3D transformations.
 */
export declare class Matrix4 {
    /**
     * The matrix data in column-major order.
     */
    data: Float32Array;
    /**
     * Creates a new Matrix4 and initializes it to the identity matrix.
     */
    constructor();
    /**
     * Sets the matrix to the identity matrix.
     * @returns this
     */
    identity(): Matrix4;
    /**
     * Composes the matrix from position, rotation (Euler), and scale.
     * Uses Y * X * Z rotation order.
     * @param pos The position vector.
     * @param rot The rotation vector (Euler angles in radians).
     * @param scale The scale vector.
     * @returns this
     */
    compose(pos: Vector3D, rot: Vector3D, scale: Vector3D): this;
    /**
     * Sets the matrix to a translation matrix.
     * @param v The translation vector.
     * @param out The output matrix.
     */
    static translate(v: Vector3D, out: Matrix4): void;
    /**
     * Sets the matrix to a uniform scale matrix.
     * @param s The scale factor.
     * @param out The output matrix.
     */
    static scale(s: number, out: Matrix4): void;
    /**
     * Sets the matrix to a rotation matrix around the X-axis.
     * @param r The rotation angle in radians.
     * @param out The output matrix.
     */
    static rotateX(r: number, out: Matrix4): void;
    /**
     * Sets the matrix to a rotation matrix around the Y-axis.
     * @param r The rotation angle in radians.
     * @param out The output matrix.
     */
    static rotateY(r: number, out: Matrix4): void;
    /**
     * Sets the matrix to a rotation matrix around the Z-axis.
     * @param r The rotation angle in radians.
     * @param out The output matrix.
     */
    static rotateZ(r: number, out: Matrix4): void;
    /**
     * Multiplies two matrices and stores the result in out.
     * @param a The first matrix.
     * @param b The second matrix.
     * @param out The output matrix.
     */
    static multiply(a: Matrix4, b: Matrix4, out: Matrix4): void;
    /**
     * Sets the matrix to a perspective projection matrix.
     * @param fov Field of view in radians.
     * @param aspect Aspect ratio.
     * @param near Near plane.
     * @param far Far plane.
     * @param out The output matrix.
     */
    static perspective(fov: number, aspect: number, near: number, far: number, out: Matrix4): void;
    /**
     * Sets the matrix to an orthographic projection matrix.
     * @param l Left edge.
     * @param r Right edge.
     * @param b Bottom edge.
     * @param t Top edge.
     * @param n Near plane.
     * @param f Far plane.
     * @param out The output matrix.
     */
    static orthographic(l: number, r: number, b: number, t: number, n: number, f: number, out: Matrix4): void;
    /**
     * Sets the matrix to a look-at matrix.
     * @param eye Camera position.
     * @param target Target position.
     * @param up Up vector.
     * @param out The output matrix.
     */
    static lookAt(eye: Vector3D, target: Vector3D, up: Vector3D, out: Matrix4): void;
    /**
     * Transforms a vector in-place with this matrix.
     * @param v The vector to transform.
     * @returns The transformed vector.
     */
    transformVector(v: Vector3D): Vector3D;
    /**
     * Inverts this matrix and stores the result in out.
     * @param out The output matrix.
     * @returns True if the inversion was successful.
     */
    invert(out: Matrix4): boolean;
}
