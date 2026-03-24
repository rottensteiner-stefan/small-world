export declare class TextureGenerator {
    /**
     * Generiert eine einfache, rauschende Textur für unser Terrain.
     */
    static generateBiome(r: number, g: number, b: number, noiseSpread: number, size?: number): Promise<ImageBitmap>;
    static createSand(): Promise<ImageBitmap>;
    static createGrass(): Promise<ImageBitmap>;
    static createRock(): Promise<ImageBitmap>;
    static createSnow(): Promise<ImageBitmap>;
}
