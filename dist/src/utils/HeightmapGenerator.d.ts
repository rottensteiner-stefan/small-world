/**
 * Utility class for heightmap generation using various algorithms.
 */
export declare class HeightmapGenerator {
    /**
     * Generates a heightmap using the Diamond-Square algorithm as an ImageBitmap.
     * @param detail Size = 2^detail + 1.
     * @param roughness The roughness factor.
     * @returns A promise resolving to an ImageBitmap.
     */
    static generateDiamondSquare(detail?: number, roughness?: number): Promise<ImageBitmap>;
    /**
     * Generates a heightmap as a Float32Array using the Diamond-Square algorithm.
     * @param detail Size = 2^detail + 1.
     * @param roughness The roughness factor.
     * @param seed Optional seed for random generation.
     * @returns A promise resolving to a Float32Array.
     */
    static generateDiamondSquareFloat(detail?: number, roughness?: number, seed?: string): Promise<Float32Array>;
    /**
     * Generates a heightmap using Perlin noise.
     * @param detail Size = 2^detail + 1.
     * @param scale Noise scale.
     * @param offsetX X offset.
     * @param offsetY Y offset.
     * @param octaves Number of octaves.
     * @param persistence Persistence factor.
     * @returns A promise resolving to a Float32Array.
     */
    static generatePerlinFloat(detail?: number, scale?: number, offsetX?: number, offsetY?: number, octaves?: number, persistence?: number): Promise<Float32Array>;
    /**
     * Generates a heightmap using Simplex noise.
     * @param detail Size = 2^detail + 1.
     * @param scale Noise scale.
     * @param offsetX X offset.
     * @param offsetY Y offset.
     * @param octaves Number of octaves.
     * @param persistence Persistence factor.
     * @returns A promise resolving to a Float32Array.
     */
    static generateSimplexFloat(detail?: number, scale?: number, offsetX?: number, offsetY?: number, octaves?: number, persistence?: number): Promise<Float32Array>;
    private static _cyrb128;
    private static _mulberry32;
}
