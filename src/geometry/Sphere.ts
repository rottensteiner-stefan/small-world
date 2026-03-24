/// src/geometry/Sphere.ts
import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * A sphere geometry.
 */
export class Sphere extends AbstractGeometry {
  /**
   * Creates a new Sphere geometry.
   * @param radius The radius of the sphere.
   * @param widthSegments The number of horizontal segments.
   * @param heightSegments The number of vertical segments.
   */
  constructor(
    public radius: number = 1,
    public widthSegments: number = 16,
    public heightSegments: number = 12,
  ) {
    super();
    this.generateGeometryData();
  }

  /**
   * @inheritdoc
   */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const n: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];

    for (let y = 0; y <= this.heightSegments; y++) {
      const vRatio: number = y / this.heightSegments;
      const phi: number = vRatio * Math.PI;

      for (let x = 0; x <= this.widthSegments; x++) {
        const uRatio: number = x / this.widthSegments;
        const theta: number = uRatio * Math.PI * 2;

        const px: number = -(this.radius * Math.sin(phi) * Math.cos(theta));
        const py: number = this.radius * Math.cos(phi);
        const pz: number = this.radius * Math.sin(phi) * Math.sin(theta);

        v.push(px, py, pz);

        n.push(px / this.radius, py / this.radius, pz / this.radius);

        uv.push(uRatio, 1 - vRatio);
      }
    }

    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.widthSegments; x++) {
        const first: number = y * (this.widthSegments + 1) + x;
        const second: number = first + this.widthSegments + 1;
        idx.push(first, second, first + 1);
        idx.push(second, second + 1, first + 1);
      }
    }

    this._vertices = new Float32Array(v);
    this._normals = new Float32Array(n);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint16Array(idx);
  }
}
