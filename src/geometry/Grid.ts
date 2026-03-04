import { IGeometryData } from "../interfaces/IGeometryData.js";
import { IGeometry } from "../interfaces/IGeometry.js";

export class Grid implements IGeometry{
  constructor(
    public size: number = 20,
    public divisions: number = 20,
  ) {}

  public getGeometryData(): IGeometryData {
    const v: number[] = [];
    const i: number[] = [];
    const step = this.size / this.divisions;
    const half = this.size / 2;

    let index = 0;
    for (let j = 0; j <= this.divisions; j++) {
      const pos = j * step - half;
      v.push(pos, 0, -half, pos, 0, half);
      i.push(index, index + 1);
      index += 2;
      v.push(-half, 0, pos, half, 0, pos);
      i.push(index, index + 1);
      index += 2;
    }

    return {
      vertices: new Float32Array(v),
      indices: new Uint16Array(i),
    };
  }
}
