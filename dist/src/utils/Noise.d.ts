/**
 * Eine Fassade für die 'simplex-noise' Library, um eine konsistente API zu bieten.
 * Stellt statische Methoden für Perlin- und Simplex-Noise bereit.
 */
export declare class Noise {
    private static _noise2D;
    private static _noise3D;
    private static _initialized;
    private static init;
    /**
     * 3D Simplex Noise.
     * @param x X-Koordinate
     * @param y Y-Koordinate
     * @param z Z-Koordinate
     * @returns Wert zwischen -1.0 und 1.0
     */
    static perlin3(x: number, y: number, z: number): number;
    /**
     * 2D Simplex Noise.
     */
    static perlin2(x: number, y: number): number;
    /**
     * 2D Simplex Noise.
     */
    static simplex2(x: number, y: number): number;
}
