/**
 * A facade for the 'simplex-noise' library to provide a consistent API.
 * Provides static methods for Perlin and Simplex noise.
 */
export declare class Noise {
    private static _noise2D;
    private static _noise3D;
    private static _initialized;
    private static _init;
    /**
     * 3D Simplex Noise.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @param z Z coordinate.
     * @returns Value between -1.0 and 1.0.
     */
    static perlin3(x: number, y: number, z: number): number;
    /**
     * 2D Simplex Noise.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @returns Value between -1.0 and 1.0.
     */
    static perlin2(x: number, y: number): number;
    /**
     * 2D Simplex Noise.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @returns Value between -1.0 and 1.0.
     */
    static simplex2(x: number, y: number): number;
}
