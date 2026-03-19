/// src/geometry/Torus.ts
import { AbstractGeometry } from "./AbstractGeometry.js";

export class Torus extends AbstractGeometry {
  constructor(
    public radius: number = 1,
    public tube: number = 0.4,
    public radialSegments: number = 16,
    public tubularSegments: number = 32,
  ) {
    super();
    this.generateGeometryData();
  }

  protected generateGeometryData(): void {
    const v: number[] = [],
      uv: number[] = [],
      idx: number[] = [];

    for (let j = 0; j <= this.radialSegments; j++) {
      const vRatio = j / this.radialSegments;
      const vArg = vRatio * Math.PI * 2;
      const cosV = Math.cos(vArg),
        sinV = Math.sin(vArg);

      for (let i = 0; i <= this.tubularSegments; i++) {
        const uRatio = i / this.tubularSegments;
        const uArg = uRatio * Math.PI * 2;
        const cosU = Math.cos(uArg),
          sinU = Math.sin(uArg);

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
        const a = (this.tubularSegments + 1) * j + i - 1;
        const b = (this.tubularSegments + 1) * (j - 1) + i - 1;
        const c = (this.tubularSegments + 1) * (j - 1) + i;
        const d = (this.tubularSegments + 1) * j + i;

        idx.push(a, b, d);
        idx.push(b, c, d);
      }
    }

    this.vertices = new Float32Array(v);
    this.uvs = new Float32Array(uv);
    this.indices = new Uint16Array(idx);
    this.computeNormals();
  }
}
