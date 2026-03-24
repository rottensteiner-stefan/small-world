export declare class HeightmapGenerator {
    /**
     * Generiert eine Heightmap mit dem Diamond-Square-Algorithmus als ImageBitmap.
     * (Für Kompatibilität mit bestehenden Demos)
     */
    static generateDiamondSquare(detail?: number, roughness?: number): Promise<ImageBitmap>;
    /**
     * Generiert eine Heightmap als Float32Array mit Diamond-Square.
     */
    static generateDiamondSquareFloat(detail?: number, roughness?: number, seed?: string): Promise<Float32Array>;
    /**
     * Generiert eine Heightmap mit Perlin Noise.
     * Perfekt für Infinite Terrain, da nahtlos.
     * @param detail Größe = 2^detail + 1
     * @param scale Skalierung des Noise (kleiner = mehr Zoom)
     * @param offsetX Verschiebung in X (für Chunks)
     * @param offsetY Verschiebung in Y (für Chunks)
     * @param octaves Anzahl der Noise-Schichten (mehr = detaillierter)
     * @param persistence Wie stark jede Oktave beiträgt (0-1)
     */
    static generatePerlinFloat(detail?: number, scale?: number, offsetX?: number, offsetY?: number, octaves?: number, persistence?: number): Promise<Float32Array>;
    /**
     * Generiert eine Heightmap mit Simplex Noise.
     * Oft schneller und visuell ansprechender als Perlin.
     */
    static generateSimplexFloat(detail?: number, scale?: number, offsetX?: number, offsetY?: number, octaves?: number, persistence?: number): Promise<Float32Array>;
    private static cyrb128;
    private static mulberry32;
}
