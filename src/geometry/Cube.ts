import { ObjectGeometry } from "./ObjectGeometry.js";
export class Cube extends ObjectGeometry {
  constructor(public size: number = 1) {
    super();
    this.generateGeometryData();
  }
  protected generateGeometryData(): void {
    const h = this.size / 2;
    this.vertices = new Float32Array([
      -h,
      -h,
      h,
      h,
      -h,
      h,
      h,
      h,
      h,
      -h,
      h,
      h,
      -h,
      -h,
      -h,
      h,
      -h,
      -h,
      h,
      h,
      -h,
      -h,
      h,
      -h,
    ]);
    this.indices = new Uint16Array([
      0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7,
    ]);
  }
}
