/// src/utils/Noise.ts
import { createNoise2D, createNoise3D } from "simplex-noise";
/**
 * A facade for the 'simplex-noise' library to provide a consistent API.
 * Provides static methods for Perlin and Simplex noise.
 */
export class Noise {
    static _noise2D;
    static _noise3D;
    static _initialized = false;
    static _init() {
        if (true === this._initialized) {
            return;
        }
        this._noise2D = createNoise2D();
        this._noise3D = createNoise3D();
        this._initialized = true;
    }
    /**
     * 3D Simplex Noise.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @param z Z coordinate.
     * @returns Value between -1.0 and 1.0.
     */
    static perlin3(x, y, z) {
        this._init();
        return this._noise3D(x, y, z);
    }
    /**
     * 2D Simplex Noise.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @returns Value between -1.0 and 1.0.
     */
    static perlin2(x, y) {
        this._init();
        return this._noise2D(x, y);
    }
    /**
     * 2D Simplex Noise.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @returns Value between -1.0 and 1.0.
     */
    static simplex2(x, y) {
        this._init();
        return this._noise2D(x, y);
    }
}
//# sourceMappingURL=Noise.js.map