import { ObjectGeometry } from "./ObjectGeometry.js";

export class Cube extends ObjectGeometry {
  constructor(public size: number = 1) {
    super();
    this.generateGeometryData();
  }

  protected generateGeometryData(): void {
    const h = this.size / 2;
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

    this.uvs = new Float32Array([
      // Front
      0, 0, 1, 0, 1, 1, 0, 1,
      // Back
      0, 0, 1, 0, 1, 1, 0, 1,
      // Top
      0, 0, 1, 0, 1, 1, 0, 1,
      // Bottom
      0, 0, 1, 0, 1, 1, 0, 1,
      // Right
      0, 0, 1, 0, 1, 1, 0, 1,
      // Left
      0, 0, 1, 0, 1, 1, 0, 1,
    ]);

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

    this.computeNormals();
  }
}
