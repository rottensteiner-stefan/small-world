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
    const uv: number[] = [];
    const idx: number[] = [];

    for (let y = 0; y <= this.heightSegments; y++) {
      const vRatio = y / this.heightSegments;
      const phi = vRatio * Math.PI;

      for (let x = 0; x <= this.widthSegments; x++) {
        const uRatio = x / this.widthSegments;
        const theta = uRatio * Math.PI * 2;

        v.push(
          -(this.radius * Math.sin(phi) * Math.cos(theta)),
          this.radius * Math.cos(phi),
          this.radius * Math.sin(phi) * Math.sin(theta),
        );
        uv.push(uRatio, 1 - vRatio);
      }
    }

    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.widthSegments; x++) {
        const first = y * (this.widthSegments + 1) + x;
        const second = first + this.widthSegments + 1;
        idx.push(first, second, first + 1);
        idx.push(second, second + 1, first + 1);
      }
    }

    this.vertices = new Float32Array(v);
    this.uvs = new Float32Array(uv);
    this.indices = new Uint16Array(idx);
    this.computeNormals();
  }
}
