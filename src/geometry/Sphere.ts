import { Vector3D } from "../math/Vector3D.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";

export class Sphere {
  constructor(
    public radius: number = 1,
    public widthSegments: number = 16,
    public heightSegments: number = 12,
  ) {}

  public getPrimitiveData(): IGeometryData {
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let y = 0; y <= this.heightSegments; y++) {
      const v = y / this.heightSegments;
      const phi = v * Math.PI;
      for (let x = 0; x <= this.widthSegments; x++) {
        const u = x / this.widthSegments;
        const theta = u * Math.PI * 2;
        const pos = new Vector3D(
          -(this.radius * Math.sin(phi) * Math.cos(theta)),
          this.radius * Math.cos(phi),
          this.radius * Math.sin(phi) * Math.sin(theta),
        );
        vertices.push(pos.x, pos.y, pos.z);
      }
    }
    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.widthSegments; x++) {
        const first = y * (this.widthSegments + 1) + x;
        const second = first + this.widthSegments + 1;
        indices.push(first, second, first, first + 1);
      }
    }
    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }
}
