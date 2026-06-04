/// src/math/Vector3D.ts
/**
 * A class representing a 3D vector.
 * Data is stored as individual properties for fast access in JS engines.
 */
export class Vector3D {
    x;
    y;
    z;
    /** Static zero vector to avoid unnecessary allocations. Should be treated as read-only. */
    static ZERO = new Vector3D(0, 0, 0);
    /**
     * Creates a new Vector3D.
     * @param x The x component. Defaults to 0.
     * @param y The y component. Defaults to 0.
     * @param z The z component. Defaults to 0.
     */
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    /**
     * Sets the components of the vector.
     * @param x The x component.
     * @param y The y component. Defaults to x.
     * @param z The z component. Defaults to y.
     * @returns this
     */
    set(x, y = x, z = y) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    /**
     * Adds another vector to this one.
     * @param v The vector to add.
     * @returns this
     */
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    /**
     * Subtracts another vector from this one.
     * @param v The vector to subtract.
     * @returns this
     */
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    /**
     * Scales the vector by a scalar value.
     * @param s The scalar factor.
     * @returns this
     */
    scale(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }
    /**
     * Calculates the dot product of this vector and another.
     * @param v The other vector.
     * @returns The dot product.
     */
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    /**
     * Adds a scalar value to all components.
     * @param s The scalar to add.
     * @returns this
     */
    addScalar(s) {
        this.x += s;
        this.y += s;
        this.z += s;
        return this;
    }
    /**
     * Multiplies the vector components by another vector (component-wise).
     * @param v The vector to multiply by.
     * @returns this
     */
    multiply(v) {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }
    /**
     * Divides the vector by a scalar.
     * @param s The scalar to divide by.
     * @returns this
     */
    divideScalar(s) {
        return this.scale(1.0 / s);
    }
    /**
     * Calculates the cross product of this vector and another vector.
     * @param v The other vector.
     * @returns this
     */
    cross(v) {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        this.x = y * v.z - z * v.y;
        this.y = z * v.x - x * v.z;
        this.z = x * v.y - y * v.x;
        return this;
    }
    /**
     * Calculates the cross product of two vectors and stores the result in this vector.
     * @param a The first vector.
     * @param b The second vector.
     * @returns this
     */
    crossVectors(a, b) {
        const ax = a.x;
        const ay = a.y;
        const az = a.z;
        const bx = b.x;
        const by = b.y;
        const bz = b.z;
        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;
    }
    /**
     * Calculates the squared length of the vector.
     * @returns The squared length.
     */
    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    /**
     * Calculates the Euclidean length of the vector.
     * @returns The length.
     */
    length() {
        return Math.sqrt(this.lengthSq());
    }
    /**
     * Calculates the squared distance to another vector.
     * @param v The other vector.
     * @returns The squared distance.
     */
    distanceToSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }
    /**
     * Calculates the Euclidean distance to another vector.
     * @param v The other vector.
     * @returns The distance.
     */
    distanceTo(v) {
        return Math.sqrt(this.distanceToSq(v));
    }
    /**
     * Copies components from another vector.
     * @param v The vector to copy from.
     * @returns this
     */
    copyFrom(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    /**
     * Sets this vector's components to the minimum of its own and the given vector's.
     * @param v The other vector.
     * @returns this
     */
    min(v) {
        this.x = Math.min(this.x, v.x);
        this.y = Math.min(this.y, v.y);
        this.z = Math.min(this.z, v.z);
        return this;
    }
    /**
     * Sets this vector's components to the maximum of its own and the given vector's.
     * @param v The other vector.
     * @returns this
     */
    max(v) {
        this.x = Math.max(this.x, v.x);
        this.y = Math.max(this.y, v.y);
        this.z = Math.max(this.z, v.z);
        return this;
    }
    /**
     * Clones the vector into a new instance.
     * @returns A new Vector3D.
     */
    clone() {
        return new Vector3D(this.x, this.y, this.z);
    }
    /**
     * Clamps the vector components between min and max vectors.
     * @param min The minimum vector.
     * @param max The maximum vector.
     * @returns this
     */
    clamp(min, max) {
        this.x = Math.max(min.x, Math.min(max.x, this.x));
        this.y = Math.max(min.y, Math.min(max.y, this.y));
        this.z = Math.max(min.z, Math.min(max.z, this.z));
        return this;
    }
    /**
     * Normalizes the vector to a unit length of 1.
     * @returns this
     */
    normalize() {
        const len = this.length();
        if (0.000001 < len) {
            const invLen = 1.0 / len;
            this.x *= invLen;
            this.y *= invLen;
            this.z *= invLen;
        }
        else {
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        return this;
    }
    /**
     * Transforms the direction of this vector with a matrix.
     * This ignores the translation component of the matrix.
     * @param m The transformation matrix.
     * @returns this
     */
    transformDirection(m) {
        const d = m.data;
        const x = this.x;
        const y = this.y;
        const z = this.z;
        this.x = (d[0] ?? 0) * x + (d[4] ?? 0) * y + (d[8] ?? 0) * z;
        this.y = (d[1] ?? 0) * x + (d[5] ?? 0) * y + (d[9] ?? 0) * z;
        this.z = (d[2] ?? 0) * x + (d[6] ?? 0) * y + (d[10] ?? 0) * z;
        return this.normalize();
    }
}
//# sourceMappingURL=Vector3D.js.map