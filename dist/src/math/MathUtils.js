/// src/math/MathUtils.ts
/**
 * Utility class for mathematical operations and constants.
 */
export class MathUtils {
    /** Mathematical constant PI. */
    static PI = Math.PI;
    /** Mathematical constant 2 * PI. */
    static TWO_PI = Math.PI * 2.0;
    /** Mathematical constant PI / 2. */
    static HALF_PI = Math.PI / 2.0;
    /** Mathematical constant PI / 4. */
    static QUARTER_PI = Math.PI / 4.0;
    /** Constant to convert degrees to radians. */
    static DEG2RAD = Math.PI / 180.0;
    /** Constant to convert radians to degrees. */
    static RAD2DEG = 180.0 / Math.PI;
    static _SIN_TABLE = new Float32Array(3600);
    static _COS_TABLE = new Float32Array(3600);
    static _isInit = false;
    /**
     * Initializes the sine and cosine lookup tables for fast lookup.
     */
    static init() {
        if (true === this._isInit) {
            return;
        }
        for (let i = 0; 3600 > i; i++) {
            const rad = (i / 10) * MathUtils.DEG2RAD;
            this._SIN_TABLE[i] = Math.sin(rad);
            this._COS_TABLE[i] = Math.cos(rad);
        }
        this._isInit = true;
    }
    /**
     * Converts degrees to radians.
     * @param degrees The angle in degrees.
     * @returns The angle in radians.
     */
    static degToRad(degrees) {
        return degrees * MathUtils.DEG2RAD;
    }
    /**
     * Converts radians to degrees.
     * @param radians The angle in radians.
     * @returns The angle in degrees.
     */
    static radToDeg(radians) {
        return radians * MathUtils.RAD2DEG;
    }
    /**
     * Returns the sine of the given angle in radians using a lookup table.
     * @param rad The angle in radians.
     * @returns The sine of the angle.
     */
    static fastSin(rad) {
        let deg = (rad * 572.957) | 0;
        deg = ((deg % 3600) + 3600) % 3600;
        return this._SIN_TABLE[deg];
    }
    /**
     * Returns the cosine of the given angle in radians using a lookup table.
     * @param rad The angle in radians.
     * @returns The cosine of the angle.
     */
    static fastCos(rad) {
        let deg = (rad * 572.957) | 0;
        deg = ((deg % 3600) + 3600) % 3600;
        return this._COS_TABLE[deg];
    }
    /**
     * Clamps a value between a minimum and maximum.
     * @param val The value to clamp.
     * @param min The minimum value.
     * @param max The maximum value.
     * @returns The clamped value.
     */
    static clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }
    /**
     * Generates a unique identifier (UUID v4).
     * Uses crypto.randomUUID() if available.
     * @returns A string representation of a UUID.
     */
    static generateUUID() {
        if ("undefined" !== typeof crypto && "function" === typeof crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for insecure contexts or older browsers
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = "x" === c ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
}
//# sourceMappingURL=MathUtils.js.map