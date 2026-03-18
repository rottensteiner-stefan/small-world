import { AbstractGeometry } from "./AbstractGeometry.js";

export class Pyramid extends AbstractGeometry {
  constructor(
    public base: number = 1,
    public height: number = 1,
  ) {
    super();
    this.generateGeometryData();
  }

  protected generateGeometryData(): void {
    const b = this.base / 2;
    const h = this.height / 2;

    this.vertices = new Float32Array([
      // Vorne
      0,
      h,
      0,
      -b,
      -h,
      b,
      b,
      -h,
      b,
      // Rechts
      0,
      h,
      0,
      b,
      -h,
      b,
      b,
      -h,
      -b,
      // Hinten
      0,
      h,
      0,
      b,
      -h,
      -b,
      -b,
      -h,
      -b,
      // Links
      0,
      h,
      0,
      -b,
      -h,
      -b,
      -b,
      -h,
      b,
      // Boden (2 Dreiecke)
      -b,
      -h,
      b,
      b,
      -h,
      -b,
      b,
      -h,
      b,
      -b,
      -h,
      b,
      -b,
      -h,
      -b,
      b,
      -h,
      -b,
    ]);

    this.uvs = new Float32Array([
      // Vorne
      0.5, 1, 0, 0, 1, 0,
      // Rechts
      0.5, 1, 0, 0, 1, 0,
      // Hinten
      0.5, 1, 0, 0, 1, 0,
      // Links
      0.5, 1, 0, 0, 1, 0,
      // Boden
      0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0,
    ]);

    this.indices = new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    this.computeNormals();
  }
}
