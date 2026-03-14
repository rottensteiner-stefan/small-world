/// src/utils/TextureGenerator.ts

export class TextureGenerator {
  /**
   * Generiert eine einfache, rauschende Textur für unser Terrain.
   */
  public static async generateBiome(
    r: number,
    g: number,
    b: number,
    noiseSpread: number,
    size: number = 256,
  ): Promise<ImageBitmap> {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(size, size);

    for (let i = 0; i < imgData.data.length; i += 4) {
      // Ein simples "Weißes Rauschen" (White Noise) für die Struktur
      const noise = (Math.random() - 0.5) * noiseSpread;

      imgData.data[i] = Math.min(255, Math.max(0, r + noise)); // Rot
      imgData.data[i + 1] = Math.min(255, Math.max(0, g + noise)); // Grün
      imgData.data[i + 2] = Math.min(255, Math.max(0, b + noise)); // Blau
      imgData.data[i + 3] = 255; // Alpha
    }

    ctx.putImageData(imgData, 0, 0);
    return await createImageBitmap(canvas);
  }

  // Vorgefertigte, farblich abgestimmte Biome
  public static async createSand() {
    return this.generateBiome(214, 198, 143, 30);
  }
  public static async createGrass() {
    return this.generateBiome(86, 125, 70, 40);
  }
  public static async createRock() {
    return this.generateBiome(110, 110, 115, 60);
  }
  public static async createSnow() {
    return this.generateBiome(240, 245, 255, 15);
  }
}
