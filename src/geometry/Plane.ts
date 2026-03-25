/// src/geometry/Plane.ts

import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * A simple plane geometry.
 */
export class Plane extends AbstractGeometry {
  /**
   * Creates a new Plane geometry.
   * @param width The width of the plane.
   * @param depth The depth of the plane.
   * @param widthSegments The number of segments along the width.
   * @param depthSegments The number of segments along the depth.
   */
  constructor(
    public width: number = 1,
    public depth: number = 1,
    public widthSegments: number = 1,
    public depthSegments: number = 1,
  ) {
    super();
    this.generateGeometryData();
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

    for (let z = 0; z <= this.depthSegments; z++) {
      const vRatio: number = z / this.depthSegments;
      for (let x = 0; x <= this.widthSegments; x++) {
        const uRatio: number = x / this.widthSegments;
        v.push(uRatio * this.width - hW, 0, vRatio * this.depth - hD);
        uv.push(uRatio, 1 - vRatio);
      }
    }

    for (let z = 0; z < this.depthSegments; z++) {
      for (let x = 0; x < this.widthSegments; x++) {
        const a: number = x + (this.widthSegments + 1) * z;
        const b: number = x + (this.widthSegments + 1) * (z + 1);
        const c: number = x + 1 + (this.widthSegments + 1) * (z + 1);
        const d: number = x + 1 + (this.widthSegments + 1) * z;

        i.push(a, b, d);
        i.push(b, c, d);
      }
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint16Array(i);
    this.computeNormals();
  }
}
