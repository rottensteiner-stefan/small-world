import { ObjectGeometry } from "./ObjectGeometry.js";

export class Sphere extends ObjectGeometry {
  constructor(
    public radius: number = 1,
    public widthSegments: number = 16,
    public heightSegments: number = 12,
  ) {
    super();
    this.generateGeometryData();
  }

  protected generateGeometryData(): void {
    const v: number[] = [];
    const idx: number[] = [];

    // Vertices berechnen (bleibt identisch)
    for (let y = 0; y <= this.heightSegments; y++) {
      const phi = (y / this.heightSegments) * Math.PI;
      for (let x = 0; x <= this.widthSegments; x++) {
        const theta = (x / this.widthSegments) * Math.PI * 2;
        v.push(
          -(this.radius * Math.sin(phi) * Math.cos(theta)),
          this.radius * Math.cos(phi),
          this.radius * Math.sin(phi) * Math.sin(theta),
        );
      }
    }

    // Indizes für echte Dreiecke (Triplets) generieren
    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.widthSegments; x++) {
        const first = y * (this.widthSegments + 1) + x;
        const second = first + this.widthSegments + 1;

        // Zwei Dreiecke pro Segment-Viereck (gegen den Uhrzeigersinn)
        idx.push(first, second, first + 1);
        idx.push(second, second + 1, first + 1);
      }
    }

    this.vertices = new Float32Array(v);
    this.indices = new Uint16Array(idx);
  }
}
