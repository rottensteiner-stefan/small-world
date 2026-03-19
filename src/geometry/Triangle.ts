/// src/geometry/Triangle.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { Vector3D } from "../math/Vector3D.js";

export class Triangle extends AbstractGeometry {
  constructor(
    public pointA: Vector3D,
    public pointB: Vector3D,
    public pointC: Vector3D,
  ) {
    super();
    this.generateGeometryData();
  }
  protected generateGeometryData(): void {
    this.vertices = new Float32Array([
      this.pointA.x,
      this.pointA.y,
      this.pointA.z,
      this.pointB.x,
      this.pointB.y,
      this.pointB.z,
      this.pointC.x,
      this.pointC.y,
      this.pointC.z,
    ]);
    this.uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
    this.indices = new Uint16Array([0, 1, 1, 2, 2, 0]); // Note: This is drawing as lines based on your old indices!
  }
}
