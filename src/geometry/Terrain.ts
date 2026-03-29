/// src/geometry/Terrain.ts

import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * Strategy for extracting height from color data.
 */
export type TerrainHeightStrategy = (
  r: number,
  g: number,
  b: number,
  a: number,
  maxHeight?: number,
) => number;

/**
 * Built-in terrain height strategies.
 */
export const TerrainStrategies = {
  CENTERED_AVERAGE: (r: number, g: number, b: number, _a: number): number => {
    return (r + g + b) / 3.0 / 255.0;
  },
  BASE_RED: (r: number, _g: number, _b: number, _a: number): number => {
    return r / 255.0;
  },
  BASE_GREEN: (_r: number, g: number, _b: number, _a: number): number => {
    return g / 255.0;
  },
  BASE_BLUE: (_r: number, _g: number, b: number, _a: number): number => {
    return b / 255.0;
  },
  BASE_ALPHA: (_r: number, _g: number, _b: number, a: number): number => {
    return a / 255.0;
  },
  INVERTED_AVERAGE: (r: number, g: number, b: number, _a: number): number => {
    return 1.0 - (r + g + b) / 3.0 / 255.0;
  },
} as const;

/**
 * Configuration options for terrain geometry.
 */
export interface TerrainOptions {
  /** The width of the terrain. Defaults to 100. */
  width?: number;
  /** The depth of the terrain. Defaults to 100. */
  depth?: number;
  /** The maximum height of the terrain. Defaults to 20. */
  maxHeight?: number;
  /** The number of segments along the width for the mesh. Defaults to 64. */
  meshWidthSegments?: number;
  /** The number of segments along the depth for the mesh. Defaults to 64. */
  meshDepthSegments?: number;
}

/**
 * Configuration for terrain from raw data.
 */
export interface TerrainDataOptions extends TerrainOptions {
  /** The height data (normalized 0-1). */
  heightData: Float32Array;
  /** The resolution of the heightmap. */
  heightmapResolution: number;
}

/**
 * Configuration for terrain from an image.
 */
export interface TerrainImageOptions extends TerrainOptions {
  /** The image to use as heightmap. */
  image: HTMLImageElement | ImageBitmap;
  /** The strategy to extract height from image data. Defaults to CENTERED_AVERAGE. */
  strategy?: TerrainHeightStrategy;
}

/**
 * A terrain geometry generated from height data.
 */
export class Terrain extends AbstractGeometry {
  /** The height data. */
  public heightData: Float32Array;

  /** The resolution of the heightmap. */
  public heightmapResolution: number;

  /** The width of the terrain. */
  public width: number;

  /** The depth of the terrain. */
  public depth: number;

  /** The maximum height of the terrain. */
  public maxHeight: number;

  /** The number of segments along the width. */
  public meshWidthSegments: number;

  /** The number of segments along the depth. */
  public meshDepthSegments: number;

  /**
   * Protected constructor. Use Terrain.fromHeightData() or Terrain.fromImage() instead.
   * @param options The configuration options.
   */
  protected constructor(options: TerrainDataOptions) {
    super();
    const {
      heightData,
      heightmapResolution,
      width = 100,
      depth = 100,
      maxHeight = 20,
      meshWidthSegments = 64,
      meshDepthSegments = 64,
    } = options;

    this.heightData = heightData;
    this.heightmapResolution = heightmapResolution;
    this.width = width;
    this.depth = depth;
    this.maxHeight = maxHeight;
    this.meshWidthSegments = meshWidthSegments;
    this.meshDepthSegments = meshDepthSegments;

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
   * @param options The configuration options.
   * @returns A new Terrain instance.
   */
  public static fromHeightData(options: TerrainDataOptions): Terrain {
    return new Terrain(options);
  }

  /**
   * Creates a Terrain from an image.
   * @param options The configuration options.
   * @returns A promise resolving to a new Terrain instance.
   */
  public static async fromImage(options: TerrainImageOptions): Promise<Terrain> {
    const { image, strategy = TerrainStrategies.CENTERED_AVERAGE, maxHeight = 20 } = options;

    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx: CanvasRenderingContext2D = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(image as CanvasImageSource, 0, 0);
    const imgData: Uint8ClampedArray = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const resolution: number = image.width; // Annahme: Quadratisches Bild
    const heightData: Float32Array = new Float32Array(resolution * resolution);

    for (let y: number = 0; y < resolution; y++) {
      for (let x: number = 0; x < resolution; x++) {
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

    return new Terrain({
      ...options,
      heightData,
      heightmapResolution: resolution,
    });
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const i: number[] = [];

    const hW: number = this.width / 2;
    const hD: number = this.depth / 2;

    for (let z: number = 0; z <= this.meshDepthSegments; z++) {
      const vRatio: number = z / this.meshDepthSegments;

      for (let x: number = 0; x <= this.meshWidthSegments; x++) {
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

    for (let z: number = 0; z < this.meshDepthSegments; z++) {
      for (let x: number = 0; x < this.meshWidthSegments; x++) {
        const a: number = x + (this.meshWidthSegments + 1) * z;
        const b: number = x + (this.meshWidthSegments + 1) * (z + 1);
        const c: number = x + 1 + (this.meshWidthSegments + 1) * (z + 1);
        const d: number = x + 1 + (this.meshWidthSegments + 1) * z;

        // Korrektur: CCW Winding Order (für WebGL/WebGPU Standard)
        // Triangle 1: a, b, d
        i.push(a, b, d);
        // Triangle 2: d, b, c
        i.push(d, b, c);
      }
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint32Array(i);

    this.computeNormals();
  }
}
