import { Vector3D } from "../math/Vector3D.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { IGeometry } from "../interfaces/IGeometry.js";

export class Line implements IGeometry{
  constructor(
    public start: Vector3D,
    public end: Vector3D,
  ) {}

  public getGeometryData(): IGeometryData {
    return {
      vertices: new Float32Array([
        this.start.x,
        this.start.y,
        this.start.z,
        this.end.x,
        this.end.y,
        this.end.z,
      ]),
      indices: new Uint16Array([0, 1]),
    };
  }
}
