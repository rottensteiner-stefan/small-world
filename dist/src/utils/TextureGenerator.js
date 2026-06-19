/// src/utils/TextureGenerator.ts
/**
 * Utility class for procedural texture generation.
 * Provides methods to create organic textures for terrain biomes.
 */
export class TextureGenerator {
    /**
     * Generates a simple noisy texture for terrain biomes.
     * @param r Base red component.
     * @param g Base green component.
     * @param b Base blue component.
     * @param noiseSpread How much noise to add.
     * @param size Texture size.
     * @returns A promise resolving to an ImageBitmap.
     */
    static async generateBiome(r, g, b, noiseSpread, size = 256) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(size, size);
        for (let i = 0; imgData.data.length > i; i += 4) {
            const noise = (Math.random() - 0.5) * noiseSpread;
            imgData.data[i] = Math.min(255, Math.max(0, r + noise));
            imgData.data[i + 1] = Math.min(255, Math.max(0, g + noise));
            imgData.data[i + 2] = Math.min(255, Math.max(0, b + noise));
            imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        return await createImageBitmap(canvas);
    }
    /**
     * Creates a sand texture.
     * @returns ImageBitmap
     */
    static async createSand() {
        return this.generateBiome(214, 198, 143, 30);
    }
    /**
     * Creates a grass texture.
     * @returns ImageBitmap
     */
    static async createGrass() {
        return this.generateBiome(86, 125, 70, 40);
    }
    /**
     * Creates a rock texture.
     * @returns ImageBitmap
     */
    static async createRock() {
        return this.generateBiome(110, 110, 115, 60);
    }
    /**
     * Creates a snow texture.
     * @returns ImageBitmap
     */
    static async createSnow() {
        return this.generateBiome(240, 245, 255, 15);
    }
}
//# sourceMappingURL=TextureGenerator.js.map