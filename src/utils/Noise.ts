/// src/utils/Noise.ts
import { createNoise2D, createNoise3D, Noise2D, Noise3D } from "simplex-noise";

/**
 * Eine Fassade für die 'simplex-noise' Library, um eine konsistente API zu bieten.
 * Stellt statische Methoden für Perlin- und Simplex-Noise bereit.
 */
export class Noise {
  private static _noise2D: Noise2D;
  private static _noise3D: Noise3D;
  private static _initialized = false;

  private static init() {
    if (this._initialized) return;

    // Erstelle Standard-Instanzen ohne Seed
    this._noise2D = createNoise2D();
    this._noise3D = createNoise3D();
    this._initialized = true;
  }

  /**
   * 3D Simplex Noise.
   * @param x X-Koordinate
   * @param y Y-Koordinate
   * @param z Z-Koordinate
   * @returns Wert zwischen -1.0 und 1.0
   */
  public static perlin3(x: number, y: number, z: number): number {
    this.init();
    return this._noise3D(x, y, z);
  }

  /**
   * 2D Simplex Noise.
   */
  public static perlin2(x: number, y: number): number {
    this.init();
    return this._noise2D(x, y);
  }

  /**
   * 2D Simplex Noise.
   */
  public static simplex2(x: number, y: number): number {
    this.init();
    return this._noise2D(x, y);
  }
}
