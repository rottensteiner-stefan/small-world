import { ObjectGeometry } from "./ObjectGeometry.js";
export class Circle extends ObjectGeometry {
  constructor(public radius: number = 1, public segments: number = 32) { super(); this.generateGeometryData(); }
  protected generateGeometryData(): void {
    const v: number[] = []; const i: number[] = [];
    for (let n = 0; n < this.segments; n++) {
      const theta = (n / this.segments) * Math.PI * 2;
      v.push(Math.cos(theta) * this.radius, 0, Math.sin(theta) * this.radius);
      i.push(n, (n + 1) % this.segments);
    }
    this.vertices = new Float32Array(v); this.indices = new Uint16Array(i);
  }
}
