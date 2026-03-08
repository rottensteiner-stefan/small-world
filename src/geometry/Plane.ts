import { ObjectGeometry } from "./ObjectGeometry.js";
export class Plane extends ObjectGeometry {
  constructor(public width: number = 1, public depth: number = 1, public widthSegments: number = 1, public depthSegments: number = 1) {
    super(); this.generateGeometryData();
  }
  protected generateGeometryData(): void {
    const v: number[] = []; const i: number[] = [];
    const hW = this.width / 2; const hD = this.depth / 2;
    const sW = this.width / this.widthSegments; const sD = this.depth / this.depthSegments;
    for (let z = 0; z <= this.depthSegments; z++) {
      for (let x = 0; x <= this.widthSegments; x++) { v.push(x * sW - hW, 0, z * sD - hD); }
    }
    for (let z = 0; z <= this.depthSegments; z++) {
      for (let x = 0; x <= this.widthSegments; x++) {
        const cur = z * (this.widthSegments + 1) + x;
        if (x < this.widthSegments) i.push(cur, cur + 1);
        if (z < this.depthSegments) i.push(cur, cur + (this.widthSegments + 1));
      }
    }
    this.vertices = new Float32Array(v); this.indices = new Uint16Array(i);
  }
}
