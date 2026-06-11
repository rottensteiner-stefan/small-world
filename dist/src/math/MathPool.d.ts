import { Vector3D } from './Vector3D.js';
import { Matrix4 } from './Matrix4.js';
import { Quaternion } from './Quaternion.js';
/**
 * A pool for mathematical objects to reduce garbage collection pressure.
 */
export declare class MathPool {
    private static readonly _VECTOR_POOL;
    private static readonly _MATRIX_POOL;
    private static readonly _QUATERNION_POOL;
    /**
     * Acquires a Vector3D from the pool.
     * @returns A Vector3D instance.
     */
    static acquireVector(): Vector3D;
    /**
     * Releases a Vector3D back into the pool.
     * @param v The Vector3D to release.
     */
    static releaseVector(v: Vector3D): void;
    /**
     * Acquires a Matrix4 from the pool.
     * @returns A Matrix4 instance.
     */
    static acquireMatrix(): Matrix4;
    /**
     * Releases a Matrix4 back into the pool.
     * @param m The Matrix4 to release.
     */
    static releaseMatrix(m: Matrix4): void;
    /**
     * Acquires a Quaternion from the pool.
     * @returns A Quaternion instance.
     */
    static acquireQuaternion(): Quaternion;
    /**
     * Releases a Quaternion back into the pool.
     * @param q The Quaternion to release.
     */
    static releaseQuaternion(q: Quaternion): void;
}
