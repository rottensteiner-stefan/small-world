/// src/geometry/Line.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { Vector3D } from "../math/Vector3D.js";

export class Line extends AbstractGeometry {
  constructor(
    public start: Vector3D,
    public end: Vector3D,
  ) {
    super();
    this.generateGeometryData();
  }
  protected generateGeometryData(): void {
    this.vertices = new Float32Array([
      this.start.x,
      this.start.y,
      this.start.z,
      this.end.x,
      this.end.y,
      this.end.z,
    ]);
    this.uvs = new Float32Array([0, 0, 1, 1]);
    this.indices = new Uint16Array([0, 1]);
  }
}
