/// src/geometry/Pyramid.ts

import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * A pyramid geometry.
 */
export class Pyramid extends AbstractGeometry {
  /**
   * Creates a new Pyramid geometry.
   * @param base The base size.
   * @param height The height.
   */
  constructor(
    public base: number = 1,
    public height: number = 1,
  ) {
    super();
    this.generateGeometryData();
  }

  /**
   * @inheritdoc
   */
  protected override generateGeometryData(): void {
    const b: number = this.base / 2;
    const h: number = this.height / 2;

    this._vertices = new Float32Array([
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

    this._uvs = new Float32Array([
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

    this._indices = new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    this.computeNormals();
  }
}
