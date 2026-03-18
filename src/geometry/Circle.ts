import { AbstractGeometry } from "./AbstractGeometry.js";

export class Circle extends AbstractGeometry {
  constructor(
    public radius: number = 1,
    public segments: number = 32,
  ) {
    super();
    this.generateGeometryData();
  }
  protected generateGeometryData(): void {
    const v: number[] = [],
      uv: number[] = [],
      i: number[] = [];
    for (let n = 0; n < this.segments; n++) {
      const theta = (n / this.segments) * Math.PI * 2;
      const cos = Math.cos(theta),
        sin = Math.sin(theta);
      v.push(cos * this.radius, 0, sin * this.radius);
      uv.push(0.5 + cos * 0.5, 0.5 + sin * 0.5);
      i.push(n, (n + 1) % this.segments);
    }
    this.vertices = new Float32Array(v);
    this.uvs = new Float32Array(uv);
    this.indices = new Uint16Array(i);
  }
}
