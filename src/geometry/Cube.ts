import { ObjectGeometry } from "./ObjectGeometry.js";

export class Cube extends ObjectGeometry {
  constructor(public size: number = 1) {
    super();
    this.generateGeometryData();
  }

  protected generateGeometryData(): void {
    const h = this.size / 2;
    // 24 Ecken (Jede der 6 Seiten hat 4 eigene Ecken, damit das Licht harte Kanten wirft)
    this.vertices = new Float32Array([
      // Front
      -h,
      -h,
      h,
      h,
      -h,
      h,
      h,
      h,
      h,
      -h,
      h,
      h,
      // Back
      h,
      -h,
      -h,
      -h,
      -h,
      -h,
      -h,
      h,
      -h,
      h,
      h,
      -h,
      // Top
      -h,
      h,
      h,
      h,
      h,
      h,
      h,
      h,
      -h,
      -h,
      h,
      -h,
      // Bottom
      -h,
      -h,
      -h,
      h,
      -h,
      -h,
      h,
      -h,
      h,
      -h,
      -h,
      h,
      // Right
      h,
      -h,
      h,
      h,
      -h,
      -h,
      h,
      h,
      -h,
      h,
      h,
      h,
      // Left
      -h,
      -h,
      -h,
      -h,
      -h,
      h,
      -h,
      h,
      h,
      -h,
      h,
      -h,
    ]);

    // 36 Indizes (12 Dreiecke)
    this.indices = new Uint16Array([
      0,
      1,
      2,
      0,
      2,
      3, // Front
      4,
      5,
      6,
      4,
      6,
      7, // Back
      8,
      9,
      10,
      8,
      10,
      11, // Top
      12,
      13,
      14,
      12,
      14,
      15, // Bottom
      16,
      17,
      18,
      16,
      18,
      19, // Right
      20,
      21,
      22,
      20,
      22,
      23, // Left
    ]);

    this.computeNormals(); // <--- Generiert sofort die Normalen
  }
}
