/// src/geometry/Circle.ts
import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * A simple circle geometry.
 */
export class Circle extends AbstractGeometry {
  /**
   * Creates a new Circle geometry.
   * @param radius The radius of the circle.
   * @param segments The number of segments.
   */
  constructor(
    public radius: number = 1,
    public segments: number = 32,
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
    for (let n = 0; n < this.segments; n++) {
      const theta: number = (n / this.segments) * Math.PI * 2;
      const cos: number = Math.cos(theta);
      const sin: number = Math.sin(theta);
      v.push(cos * this.radius, 0, sin * this.radius);
      uv.push(0.5 + cos * 0.5, 0.5 + sin * 0.5);
      i.push(n, (n + 1) % this.segments);
    }
    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint16Array(i);
  }
}
