/// src/math/Vector2D.ts
/**
 * A class representing a 2D vector.
 * Data is stored as individual properties for fast access in JS engines.
 */
export class Vector2D {
    x;
    y;
    /**
     * Creates a new Vector2D.
     * @param x The x component. Defaults to 0.
     * @param y The y component. Defaults to 0.
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    /**
     * Sets the components of the vector.
     * @param x The x component.
     * @param y The y component.
     * @returns this
     */
    set(x, y) {
        this.x = x;
        this.y = y;
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
        return this;
    }
    /**
     * Adds a scalar to this vector.
     * @param s The scalar to add.
     * @returns this
     */
    addScalar(s) {
        this.x += s;
        this.y += s;
        return this;
    }
    /**
     * Multiplies this vector by another (component-wise).
     * @param v The other vector.
     * @returns this
     */
    multiply(v) {
        this.x *= v.x;
        this.y *= v.y;
        return this;
    }
    /**
     * Divides this vector by a scalar.
     * @param s The scalar to divide by.
     * @returns this
     */
    divideScalar(s) {
        if (0 !== s) {
            const invLen = 1.0 / s;
            this.x *= invLen;
            this.y *= invLen;
        }
        else {
            this.x = 0;
            this.y = 0;
        }
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
        return this;
    }
    /**
     * Calculates the dot product of this vector and another.
     * @param v The other vector.
     * @returns The dot product.
     */
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    /**
     * Calculates the squared length of the vector.
     * @returns The squared length.
     */
    lengthSq() {
        return this.x * this.x + this.y * this.y;
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
        return dx * dx + dy * dy;
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
     * Clones the vector into a new instance.
     * @returns A new Vector2D.
     */
    clone() {
        return new Vector2D(this.x, this.y);
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
        }
        else {
            this.x = 0;
            this.y = 0;
        }
        return this;
    }
}
//# sourceMappingURL=Vector2D.js.map