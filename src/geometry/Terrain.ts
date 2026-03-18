/// src/geometry/Terrain.ts
import { AbstractGeometry } from "./AbstractGeometry.js";

// 1. Wir definieren, wie eine Strategie-Funktion aussehen muss:
// Sie bekommt die Farbwerte (0-255) eines Pixels und die Maximalhöhe, und gibt das fertige Y zurück.
export type TerrainHeightStrategy = (
  r: number,
  g: number,
  b: number,
  a: number,
  maxHeight: number,
) => number;

export const TerrainStrategies = {
  CENTERED_AVERAGE: (r: number, g: number, b: number, a: number, max: number) => {
    const heightValue = (r + g + b) / 3.0 / 255.0;
    return heightValue * max - max / 2;
  },
  BASE_RED: (r: number, g: number, b: number, a: number, max: number) => {
    const heightValue = r / 255.0;
    return heightValue * max;
  },
  BASE_GREEN: (r: number, g: number, b: number, a: number, max: number) => {
    const heightValue = g / 255.0;
    return heightValue * max;
  },
  BASE_BLUE: (r: number, g: number, b: number, a: number, max: number) => {
    const heightValue = b / 255.0;
    return heightValue * max;
  },
  BASE_ALPHA: (r: number, g: number, b: number, a: number, max: number) => {
    const heightValue = a / 255.0;
    return heightValue * max;
  },
  // Spielerei: Invertiertes Terrain (Schluchten statt Berge)
  INVERTED_AVERAGE: (r: number, g: number, b: number, a: number, max: number) => {
    const heightValue = 1.0 - (r + g + b) / 3.0 / 255.0;
    return heightValue * max - max / 2;
  },
} as const;

export class Terrain extends AbstractGeometry {
  /**
   * @param image Das geladene Bild (Heightmap)
   * @param width Breite des Terrains in Weltkoordinaten
   * @param depth Tiefe des Terrains in Weltkoordinaten
   * @param maxHeight Wie hoch ist der höchste Berg (weißester Pixel)?
   * @param widthSegments Anzahl der Unterteilungen auf der X-Achse (Auflösung)
   * @param depthSegments Anzahl der Unterteilungen auf der Z-Achse (Auflösung)
   * @param strategy Funktion zur Höhenberechnung (Standard: CENTERED_AVERAGE)
   */
  constructor(
    public image: HTMLImageElement | ImageBitmap,
    public width: number = 100,
    public depth: number = 100,
    public maxHeight: number = 20,
    public widthSegments: number = 64,
    public depthSegments: number = 64,
    public strategy: TerrainHeightStrategy = TerrainStrategies.CENTERED_AVERAGE,
  ) {
    super();
    this.generateGeometryData();
  }

  protected generateGeometryData(): void {
    const canvas = document.createElement("canvas");
    canvas.width = this.image.width;
    canvas.height = this.image.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(this.image as CanvasImageSource, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const v: number[] = [];
    const uv: number[] = [];
    const i: number[] = [];

    const hW = this.width / 2;
    const hD = this.depth / 2;

    for (let z = 0; z <= this.depthSegments; z++) {
      const vRatio = z / this.depthSegments;

      for (let x = 0; x <= this.widthSegments; x++) {
        const uRatio = x / this.widthSegments;

        const pixelX = Math.floor(uRatio * (canvas.width - 1));
        const pixelY = Math.floor(vRatio * (canvas.height - 1));
        const index = (pixelY * canvas.width + pixelX) * 4;

        // Farbwerte extrahieren
        const r = imgData[index];
        const g = imgData[index + 1];
        const b = imgData[index + 2];
        const a = imgData[index + 3];

        // X und Z sind immer gleich, Y wird durch unsere Strategie berechnet!
        const posX = uRatio * this.width - hW;
        const posZ = vRatio * this.depth - hD;
        const posY = this.strategy(r, g, b, a, this.maxHeight);

        v.push(posX, posY, posZ);
        uv.push(uRatio, 1 - vRatio);
      }
    }

    for (let z = 0; z < this.depthSegments; z++) {
      for (let x = 0; x < this.widthSegments; x++) {
        const a = x + (this.widthSegments + 1) * z;
        const b = x + (this.widthSegments + 1) * (z + 1);
        const c = x + 1 + (this.widthSegments + 1) * (z + 1);
        const d = x + 1 + (this.widthSegments + 1) * z;

        i.push(a, b, d);
        i.push(b, c, d);
      }
    }

    this.vertices = new Float32Array(v);
    this.uvs = new Float32Array(uv);
    this.indices = new Uint32Array(i);

    this.computeNormals();
  }
}
