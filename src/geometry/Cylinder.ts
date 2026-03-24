/// src/geometry/Cylinder.ts
import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * A cylinder geometry.
 */
export class Cylinder extends AbstractGeometry {
  /**
   * Creates a new Cylinder geometry.
   * @param radius The radius of the cylinder.
   * @param height The height of the cylinder.
   * @param segments The number of segments.
   */
  constructor(
    public radius: number = 1,
    public height: number = 2,
    public segments: number = 16,
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
    const hh: number = this.height / 2;

    // --- Seitenwand ---
    for (let y = 0; y <= 1; y++) {
      const yPos: number = y === 0 ? -hh : hh;
      const vCoord: number = y === 0 ? 0 : 1;
      for (let x = 0; x <= this.segments; x++) {
        const uCoord: number = x / this.segments;
        const theta: number = uCoord * Math.PI * 2;
        v.push(this.radius * Math.sin(theta), yPos, this.radius * Math.cos(theta));
        uv.push(uCoord, vCoord);
      }
    }

    for (let x = 0; x < this.segments; x++) {
      const first: number = x;
      const second: number = first + this.segments + 1;
      idx.push(first, second, first + 1);
      idx.push(second, second + 1, first + 1);
    }

    // --- Deckel Oben ---
    let offset: number = v.length / 3;
    v.push(0, hh, 0);
    uv.push(0.5, 0.5); // Zentrum
    for (let x = 0; x <= this.segments; x++) {
      const theta: number = (x / this.segments) * Math.PI * 2;
      v.push(this.radius * Math.sin(theta), hh, this.radius * Math.cos(theta));
      uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 + Math.cos(theta) * 0.5);
    }
    for (let x = 0; x < this.segments; x++) {
      idx.push(offset, offset + x + 1, offset + x + 2);
    }

    // --- Deckel Unten ---
    offset = v.length / 3;
    v.push(0, -hh, 0);
    uv.push(0.5, 0.5); // Zentrum
    for (let x = 0; x <= this.segments; x++) {
      const theta: number = (x / this.segments) * Math.PI * 2;
      v.push(this.radius * Math.sin(theta), -hh, this.radius * Math.cos(theta));
      uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 - Math.cos(theta) * 0.5);
    }
    for (let x = 0; x < this.segments; x++) {
      idx.push(offset, offset + x + 2, offset + x + 1);
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint16Array(idx);
    this.computeNormals();
  }
}
