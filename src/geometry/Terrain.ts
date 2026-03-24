/// src/geometry/Terrain.ts
import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * Strategy for extracting height from color data.
 */
export type TerrainHeightStrategy = (r: number, g: number, b: number, a: number, maxHeight?: number) => number;

/**
 * Built-in terrain height strategies.
 */
export const TerrainStrategies = {
  CENTERED_AVERAGE: (r: number, g: number, b: number, a: number): number => {
    return (r + g + b) / 3.0 / 255.0;
  },
  BASE_RED: (r: number, g: number, b: number, a: number): number => {
    return r / 255.0;
  },
  BASE_GREEN: (r: number, g: number, b: number, a: number): number => {
    return g / 255.0;
  },
  BASE_BLUE: (r: number, g: number, b: number, a: number): number => {
    return b / 255.0;
  },
  BASE_ALPHA: (r: number, g: number, b: number, a: number): number => {
    return a / 255.0;
  },
  INVERTED_AVERAGE: (r: number, g: number, b: number, a: number): number => {
    return 1.0 - (r + g + b) / 3.0 / 255.0;
  },
} as const;

/**
 * A terrain geometry generated from height data.
 */
export class Terrain extends AbstractGeometry {
  /**
   * Protected constructor. Use Terrain.fromHeightData() or Terrain.fromImage() instead.
   * @param heightData The height data.
   * @param heightmapResolution The resolution of the heightmap.
   * @param width The width of the terrain.
   * @param depth The depth of the terrain.
   * @param maxHeight The maximum height of the terrain.
   * @param meshWidthSegments The number of segments along the width.
   * @param meshDepthSegments The number of segments along the depth.
   */
  protected constructor(
    public heightData: Float32Array,
    public heightmapResolution: number,
    public width: number,
    public depth: number,
    public maxHeight: number,
    public meshWidthSegments: number,
    public meshDepthSegments: number,
  ) {
    super();
    // Sicherstellen, dass die Heightmap-Daten quadratisch sind
    if (heightData.length !== heightmapResolution * heightmapResolution) {
      console.warn(
        `[Terrain] Heightmap-Datenlänge (${heightData.length}) stimmt nicht mit der angegebenen Auflösung (${heightmapResolution}x${heightmapResolution}) überein.`,
      );
    }
    this.generateGeometryData();
  }

  /**
   * Creates a Terrain from raw height data.
   * @param heightData The height data.
   * @param heightmapResolution The resolution of the heightmap.
   * @param width The width of the terrain.
   * @param depth The depth of the terrain.
   * @param maxHeight The maximum height of the terrain.
   * @param meshWidthSegments The number of segments along the width.
   * @param meshDepthSegments The number of segments along the depth.
   * @returns A new Terrain instance.
   */
  public static fromHeightData(
    heightData: Float32Array,
    heightmapResolution: number,
    width: number = 100,
    depth: number = 100,
    maxHeight: number = 20,
    meshWidthSegments: number = 64,
    meshDepthSegments: number = 64,
  ): Terrain {
    return new Terrain(
      heightData,
      heightmapResolution,
      width,
      depth,
      maxHeight,
      meshWidthSegments,
      meshDepthSegments,
    );
  }

  /**
   * Creates a Terrain from an image.
   * @param image The image to use as heightmap.
   * @param width The width of the terrain.
   * @param depth The depth of the terrain.
   * @param maxHeight The maximum height of the terrain.
   * @param meshWidthSegments The number of segments along the width.
   * @param meshDepthSegments The number of segments along the depth.
   * @param strategy The strategy to extract height from image data.
   * @returns A new Terrain instance.
   */
  public static fromImage(
    image: HTMLImageElement | ImageBitmap,
    width: number = 100,
    depth: number = 100,
    maxHeight: number = 20,
    meshWidthSegments: number = 64,
    meshDepthSegments: number = 64,
    strategy: TerrainHeightStrategy = TerrainStrategies.CENTERED_AVERAGE,
  ): Terrain {
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx: CanvasRenderingContext2D = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(image as CanvasImageSource, 0, 0);
    const imgData: Uint8ClampedArray = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const resolution: number = image.width; // Annahme: Quadratisches Bild
    const heightData: Float32Array = new Float32Array(resolution * resolution);

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const index: number = (y * resolution + x) * 4;
        const r: number = imgData[index] ?? 0;
        const g: number = imgData[index + 1] ?? 0;
        const b: number = imgData[index + 2] ?? 0;
        const a: number = imgData[index + 3] ?? 0;

        // Die Strategie gibt einen Wert zwischen 0.0 und 1.0 zurück
        const normalizedHeight: number = strategy(r, g, b, a, maxHeight);

        heightData[y * resolution + x] = Math.max(0, Math.min(1, normalizedHeight));
      }
    }

    return new Terrain(
      heightData,
      resolution,
      width,
      depth,
      maxHeight,
      meshWidthSegments,
      meshDepthSegments,
    );
  }

  /**
   * @inheritdoc
   */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const i: number[] = [];

    const hW: number = this.width / 2;
    const hD: number = this.depth / 2;

    for (let z = 0; z <= this.meshDepthSegments; z++) {
      const vRatio: number = z / this.meshDepthSegments;

      for (let x = 0; x <= this.meshWidthSegments; x++) {
        const uRatio: number = x / this.meshWidthSegments;

        // Pixelkoordinaten in der Heightmap
        const pixelX: number = Math.floor(uRatio * (this.heightmapResolution - 1));
        const pixelY: number = Math.floor(vRatio * (this.heightmapResolution - 1));
        const heightDataIndex: number = pixelY * this.heightmapResolution + pixelX;

        // Höhe aus den übergebenen Daten abrufen (Werte sind 0.0 - 1.0)
        const heightValue: number = this.heightData[heightDataIndex] ?? 0;

        // X und Z sind immer gleich
        const posX: number = uRatio * this.width - hW;
        const posZ: number = vRatio * this.depth - hD;

        // Skalierung der Höhe und Zentrierung um Y=0
        // Hier wenden wir die Logik an: 0.0 -> -max/2, 1.0 -> +max/2
        const posY: number = heightValue * this.maxHeight - this.maxHeight / 2;

        v.push(posX, posY, posZ);
        uv.push(uRatio, 1 - vRatio);
      }
    }

    for (let z = 0; z < this.meshDepthSegments; z++) {
      for (let x = 0; x < this.meshWidthSegments; x++) {
        const a: number = x + (this.meshWidthSegments + 1) * z;
        const b: number = x + (this.meshWidthSegments + 1) * (z + 1);
        const c: number = x + 1 + (this.meshWidthSegments + 1) * (z + 1);
        const d: number = x + 1 + (this.meshWidthSegments + 1) * z;

        i.push(a, b, d);
        i.push(b, c, d);
      }
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint32Array(i);

    this.computeNormals();
  }
}
