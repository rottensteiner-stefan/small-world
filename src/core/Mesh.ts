import { Object3D } from "./Object3D.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { IBoundingVolume } from "../interfaces/IBoundingVolume.js";
import { Color } from "./Color.js";

/**
 * Ein Mesh ist ein Object3D, das tatsächlich gezeichnet werden kann.
 */
export class Mesh extends Object3D {
  public geometry: IGeometryData | null = null;
  public bounds: IBoundingVolume | null = null;
  public color: Color = Color.WHITE;

  constructor(geometry?: IGeometryData, color: Color = Color.WHITE, name: string = "") {
    super(name);
    if (geometry) this.geometry = geometry;
    this.color = color;
  }
}
