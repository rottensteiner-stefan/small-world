/// src/geometry/Torus.ts
import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * A torus geometry.
 */
export class Torus extends AbstractGeometry {
  /**
   * Creates a new Torus geometry.
   * @param radius The radius of the torus.
   * @param tube The radius of the tube.
   * @param radialSegments The number of radial segments.
   * @param tubularSegments The number of tubular segments.
   */
  constructor(
    public radius: number = 1,
    public tube: number = 0.4,
    public radialSegments: number = 16,
    public tubularSegments: number = 32,
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
    const idx: number[] = [];

    for (let j = 0; j <= this.radialSegments; j++) {
      const vRatio: number = j / this.radialSegments;
      const vArg: number = vRatio * Math.PI * 2;
      const cosV: number = Math.cos(vArg);
      const sinV: number = Math.sin(vArg);

      for (let i = 0; i <= this.tubularSegments; i++) {
        const uRatio: number = i / this.tubularSegments;
        const uArg: number = uRatio * Math.PI * 2;
        const cosU: number = Math.cos(uArg);
        const sinU: number = Math.sin(uArg);

        v.push(
          (this.radius + this.tube * cosV) * cosU,
          this.tube * sinV,
          (this.radius + this.tube * cosV) * sinU,
        );
        uv.push(uRatio, vRatio);
      }
    }

    for (let j = 1; j <= this.radialSegments; j++) {
      for (let i = 1; i <= this.tubularSegments; i++) {
        const a: number = (this.tubularSegments + 1) * j + i - 1;
        const b: number = (this.tubularSegments + 1) * (j - 1) + i - 1;
        const c: number = (this.tubularSegments + 1) * (j - 1) + i;
        const d: number = (this.tubularSegments + 1) * j + i;

        idx.push(a, b, d);
        idx.push(b, c, d);
      }
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint16Array(idx);
    this.computeNormals();
  }
}
