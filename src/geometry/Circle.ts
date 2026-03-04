import { IGeometryData } from "../interfaces/IGeometryData.js";
import { IGeometry } from "../interfaces/IGeometry.js";

export class Circle implements IGeometry{
  constructor(
    public radius: number = 1,
    public segments: number = 32,
  ) {}

  public getGeometryData(): IGeometryData {
    const v: number[] = [];
    const i: number[] = [];
    for (let n = 0; n < this.segments; n++) {
      const theta = (n / this.segments) * Math.PI * 2;
      v.push(Math.cos(theta) * this.radius, 0, Math.sin(theta) * this.radius);
      i.push(n, (n + 1) % this.segments);
    }
    return { vertices: new Float32Array(v), indices: new Uint16Array(i) };
  }
}
