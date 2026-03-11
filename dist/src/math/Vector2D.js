export class Vector2D {
    x;
    y;
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }
    length() {
        return Math.sqrt(this.lengthSq());
    }
    distanceToSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }
    distanceTo(v) {
        return Math.sqrt(this.distanceToSq(v));
    }
    clone() {
        return new Vector2D(this.x, this.y);
    }
    /**
     * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
     * @returns this (für Method Chaining)
     */
    normalize() {
        const len = this.length();
        // Prüfen, ob die Länge größer als 0 ist (mit einer kleinen Toleranz),
        // um eine Division durch Null zu vermeiden.
        if (len > 0.000001) {
            const invLen = 1 / len; // Multiplikation ist schneller als Division
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