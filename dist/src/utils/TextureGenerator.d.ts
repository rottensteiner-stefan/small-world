/**
 * Utility class for procedural texture generation.
 * Provides methods to create organic textures for terrain biomes.
 */
export declare class TextureGenerator {
    /**
     * Generates a simple noisy texture for terrain biomes.
     * @param r Base red component.
     * @param g Base green component.
     * @param b Base blue component.
     * @param noiseSpread How much noise to add.
     * @param size Texture size.
     * @returns A promise resolving to an ImageBitmap.
     */
    static generateBiome(r: number, g: number, b: number, noiseSpread: number, size?: number): Promise<ImageBitmap>;
    /**
     * Creates a sand texture.
     * @returns ImageBitmap
     */
    static createSand(): Promise<ImageBitmap>;
    /**
     * Creates a grass texture.
     * @returns ImageBitmap
     */
    static createGrass(): Promise<ImageBitmap>;
    /**
     * Creates a rock texture.
     * @returns ImageBitmap
     */
    static createRock(): Promise<ImageBitmap>;
    /**
     * Creates a snow texture.
     * @returns ImageBitmap
     */
    static createSnow(): Promise<ImageBitmap>;
}
