/// src/math/MathPool.ts
import { Vector3D } from "./Vector3D.js";
import { Matrix4 } from "./Matrix4.js";
import { Quaternion } from "./Quaternion.js";
/**
 * A pool for mathematical objects to reduce garbage collection pressure.
 */
export class MathPool {
    static _VECTOR_POOL = [];
    static _MATRIX_POOL = [];
    static _QUATERNION_POOL = [];
    /**
     * Acquires a Vector3D from the pool.
     * @returns A Vector3D instance.
     */
    static acquireVector() {
        const v = this._VECTOR_POOL.pop();
        if (v) {
            return v.set(0, 0, 0);
        }
        return new Vector3D();
    }
    /**
     * Releases a Vector3D back into the pool.
     * @param v The Vector3D to release.
     */
    static releaseVector(v) {
        this._VECTOR_POOL.push(v);
    }
    /**
     * Acquires a Matrix4 from the pool.
     * @returns A Matrix4 instance.
     */
    static acquireMatrix() {
        const m = this._MATRIX_POOL.pop();
        if (m) {
            return m.identity();
        }
        return new Matrix4();
    }
    /**
     * Releases a Matrix4 back into the pool.
     * @param m The Matrix4 to release.
     */
    static releaseMatrix(m) {
        this._MATRIX_POOL.push(m);
    }
    /**
     * Acquires a Quaternion from the pool.
     * @returns A Quaternion instance.
     */
    static acquireQuaternion() {
        const q = this._QUATERNION_POOL.pop();
        if (q) {
            return q.identity();
        }
        return new Quaternion();
    }
    /**
     * Releases a Quaternion back into the pool.
     * @param q The Quaternion to release.
     */
    static releaseQuaternion(q) {
        this._QUATERNION_POOL.push(q);
    }
}
//# sourceMappingURL=MathPool.js.map