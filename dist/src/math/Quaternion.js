/// src/math/Quaternion.ts
/**
 * A class representing a quaternion for rotations.
 */
export class Quaternion {
    /** The x component. */
    x;
    /** The y component. */
    y;
    /** The z component. */
    z;
    /** The w component. */
    w;
    /**
     * Creates a new Quaternion.
     * @param x The x component. Defaults to 0.
     * @param y The y component. Defaults to 0.
     * @param z The z component. Defaults to 0.
     * @param w The w component. Defaults to 1.
     */
    constructor(x = 0, y = 0, z = 0, w = 1) {
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
    set(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }
    /**
     * Resets the quaternion to the identity rotation.
     * @returns this
     */
    identity() {
        return this.set(0, 0, 0, 1);
    }
    /**
     * Multiplies this quaternion by another.
     * @param q The other quaternion.
     * @returns this
     */
    multiply(q) {
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
    setFromAxisAngle(axis, angle) {
        const halfAngle = angle / 2.0;
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
    setFromRotationMatrix(m) {
        const te = m.data;
        const m11 = te[0], m12 = te[4], m13 = te[8];
        const m21 = te[1], m22 = te[5], m23 = te[9];
        const m31 = te[2], m32 = te[6], m33 = te[10];
        const trace = m11 + m22 + m33;
        if (0 < trace) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            this.w = 0.25 / s;
            this.x = (m32 - m23) * s;
            this.y = (m13 - m31) * s;
            this.z = (m21 - m12) * s;
        }
        else if (m11 > m22 && m11 > m33) {
            const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
            this.w = (m32 - m23) / s;
            this.x = 0.25 * s;
            this.y = (m12 + m21) / s;
            this.z = (m13 + m31) / s;
        }
        else if (m22 > m33) {
            const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
            this.w = (m13 - m31) / s;
            this.x = (m12 + m21) / s;
            this.y = 0.25 * s;
            this.z = (m23 + m32) / s;
        }
        else {
            const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = (m13 + m31) / s;
            this.y = (m23 + m32) / s;
            this.z = 0.25 * s;
        }
        return this;
    }
    /**
     * Calculates the Euclidean length of the quaternion.
     * @returns The length.
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }
    /**
     * Normalizes the quaternion to a unit length of 1.
     * @returns this
     */
    normalize() {
        let l = this.length();
        if (0 === l) {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.w = 1;
        }
        else {
            l = 1.0 / l;
            this.x *= l;
            this.y *= l;
            this.z *= l;
            this.w *= l;
        }
        return this;
    }
    /**
     * Clones the quaternion into a new instance.
     * @returns A new Quaternion.
     */
    clone() {
        return new Quaternion(this.x, this.y, this.z, this.w);
    }
}
//# sourceMappingURL=Quaternion.js.map