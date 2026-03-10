import { ObjectGeometry } from "./ObjectGeometry.js";

export class Pyramid extends ObjectGeometry {
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

    this.indices = new Uint16Array([
      0,
      1,
      2, // Vorne
      3,
      4,
      5, // Rechts
      6,
      7,
      8, // Hinten
      9,
      10,
      11, // Links
      12,
      13,
      14, // Boden 1
      15,
      16,
      17, // Boden 2
    ]);

    this.computeNormals();
  }
}
