import { Vector3D } from "../math/Vector3D.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { IGeometry } from "../interfaces/IGeometry.js";

export class Triangle implements IGeometry {
  constructor(
    public pointA: Vector3D = new Vector3D(0, 1, 0),
    public pointB: Vector3D = new Vector3D(-1, -1, 0),
    public pointC: Vector3D = new Vector3D(1, -1, 0),
  ) {}

  public getGeometryData(): IGeometryData {
    return {
      vertices: new Float32Array([
        this.pointA.x,
        this.pointA.y,
        this.pointA.z,
        this.pointB.x,
        this.pointB.y,
        this.pointB.z,
        this.pointC.x,
        this.pointC.y,
        this.pointC.z,
      ]),
      indices: new Uint16Array([0, 1, 1, 2, 2, 0]),
    };
  }
}
