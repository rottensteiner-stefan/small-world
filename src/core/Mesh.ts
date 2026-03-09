import { Object3D } from "./Object3D.js";
import { IGeometryData } from "../interfaces/IGeometryData.js";
import { IBoundingVolume } from "../interfaces/IBoundingVolume.js";
import { Material } from "../materials/Material.js";

export class Mesh extends Object3D {
  public geometry: IGeometryData | null = null;
  public bounds: IBoundingVolume | null = null;

  // Mesh erfordert jetzt initial ein Material anstatt einer Farbe
  constructor(geometry?: IGeometryData, material?: Material, name: string = "") {
    super(name);
    if (geometry) this.geometry = geometry;
    if (material) this.material = material;
  }
}
