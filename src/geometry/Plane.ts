import { IGeometryData } from "../interfaces/IGeometryData.js";
import { IGeometry } from "../interfaces/IGeometry.js";

export class Plane implements IGeometry{
  constructor(
    public width: number = 1,
    public depth: number = 1,
    public widthSegments: number = 1,
    public depthSegments: number = 1,
  ) {}

  public getGeometryData(): IGeometryData {
    const vertices: number[] = [];
    const indices: number[] = [];
    const halfWidth = this.width / 2;
    const halfDepth = this.depth / 2;
    const segmentWidth = this.width / this.widthSegments;
    const segmentDepth = this.depth / this.depthSegments;

    for (let z = 0; z <= this.depthSegments; z++) {
      for (let x = 0; x <= this.widthSegments; x++) {
        vertices.push(x * segmentWidth - halfWidth, 0, z * segmentDepth - halfDepth);
      }
    }

    for (let z = 0; z <= this.depthSegments; z++) {
      for (let x = 0; x <= this.widthSegments; x++) {
        const current = z * (this.widthSegments + 1) + x;
        if (x < this.widthSegments) indices.push(current, current + 1);
        if (z < this.depthSegments) indices.push(current, current + (this.widthSegments + 1));
      }
    }

    return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
  }
}
