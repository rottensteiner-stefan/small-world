/// src/geometry/Terrain.ts
import { AbstractGeometry } from "./AbstractGeometry.js";

// Diese Typen bleiben hier für Referenz, werden aber in der neuen Struktur anders genutzt.
export type TerrainHeightStrategy = (r: number, g: number, b: number, a: number) => number;

export const TerrainStrategies = {
  CENTERED_AVERAGE: (r: number, g: number, b: number, a: number) => {
    return (r + g + b) / 3.0 / 255.0;
  },
  BASE_RED: (r: number, g: number, b: number, a: number) => {
    return r / 255.0;
  },
  BASE_GREEN: (r: number, g: number, b: number, a: number) => {
    return g / 255.0;
  },
  BASE_BLUE: (r: number, g: number, b: number, a: number) => {
    return b / 255.0;
  },
  BASE_ALPHA: (r: number, g: number, b: number, a: number) => {
    return a / 255.0;
  },
  INVERTED_AVERAGE: (r: number, g: number, b: number, a: number) => {
    return 1.0 - (r + g + b) / 3.0 / 255.0;
  },
} as const;

export class Terrain extends AbstractGeometry {
  /**
   * Protected Konstruktor. Bitte verwende Terrain.fromHeightData() oder Terrain.fromImage().
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
   * Erstellt ein Terrain aus rohen Höhendaten (Float32Array).
   * Die Werte im Array sollten idealerweise zwischen 0.0 und 1.0 liegen.
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
   * Erstellt ein Terrain aus einem Bild (ImageBitmap oder HTMLImageElement).
   * Konvertiert das Bild in ein Float32Array basierend auf der angegebenen Strategie.
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
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(image as CanvasImageSource, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const resolution = image.width; // Annahme: Quadratisches Bild
    const heightData = new Float32Array(resolution * resolution);

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const index = (y * resolution + x) * 4;
        const r = imgData[index];
        const g = imgData[index + 1];
        const b = imgData[index + 2];
        const a = imgData[index + 3];

        // Die Strategie gibt einen Wert zwischen 0.0 und 1.0 zurück
        const normalizedHeight = strategy(r, g, b, a, maxHeight); // maxHeight wird ignoriert, da Strategie angepasst wurde

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

  protected generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const i: number[] = [];

    const hW = this.width / 2;
    const hD = this.depth / 2;

    for (let z = 0; z <= this.meshDepthSegments; z++) {
      const vRatio = z / this.meshDepthSegments;

      for (let x = 0; x <= this.meshWidthSegments; x++) {
        const uRatio = x / this.meshWidthSegments;

        // Pixelkoordinaten in der Heightmap
        const pixelX = Math.floor(uRatio * (this.heightmapResolution - 1));
        const pixelY = Math.floor(vRatio * (this.heightmapResolution - 1));
        const heightDataIndex = pixelY * this.heightmapResolution + pixelX;

        // Höhe aus den übergebenen Daten abrufen (Werte sind 0.0 - 1.0)
        const heightValue = this.heightData[heightDataIndex];

        // X und Z sind immer gleich
        const posX = uRatio * this.width - hW;
        const posZ = vRatio * this.depth - hD;

        // Skalierung der Höhe und Zentrierung um Y=0
        // Hier wenden wir die Logik an: 0.0 -> -max/2, 1.0 -> +max/2
        const posY = heightValue * this.maxHeight - this.maxHeight / 2;

        v.push(posX, posY, posZ);
        uv.push(uRatio, 1 - vRatio);
      }
    }

    for (let z = 0; z < this.meshDepthSegments; z++) {
      for (let x = 0; x < this.meshWidthSegments; x++) {
        const a = x + (this.meshWidthSegments + 1) * z;
        const b = x + (this.meshWidthSegments + 1) * (z + 1);
        const c = x + 1 + (this.meshWidthSegments + 1) * (z + 1);
        const d = x + 1 + (this.meshWidthSegments + 1) * z;

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
