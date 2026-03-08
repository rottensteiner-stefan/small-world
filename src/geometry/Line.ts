import { ObjectGeometry } from "./ObjectGeometry.js";
import { Vector3D } from "../math/Vector3D.js";
export class Line extends ObjectGeometry {
  constructor(public start: Vector3D, public end: Vector3D) { super(); this.generateGeometryData(); }
  protected generateGeometryData(): void {
    this.vertices = new Float32Array([this.start.x, this.start.y, this.start.z, this.end.x, this.end.y, this.end.z]);
    this.indices = new Uint16Array([0, 1]);
  }
}
