export class Vector3D {
    x;
    y;
    z;
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    scale(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    length() {
        return Math.sqrt(this.lengthSq());
    }
    distanceToSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }
    distanceTo(v) {
        return Math.sqrt(this.distanceToSq(v));
    }
    copyFrom(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    clone() {
        return new Vector3D(this.x, this.y, this.z);
    }
    /**
     * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
     * @returns this (für Method Chaining)
     */
    normalize() {
        const len = this.length();
        // Prüfen, ob die Länge größer als 0 ist, um Division durch Null zu vermeiden.
        if (len > 0.000001) {
            const invLen = 1 / len; // Multiplikation ist schneller als Division
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
}
//# sourceMappingURL=Vector3D.js.map