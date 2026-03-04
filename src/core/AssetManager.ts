import { IGeometryData } from "../interfaces/IGeometryData.js";
export class AssetManager {
  private static geometries = new Map<string, IGeometryData>();
  public static register(id: string, data: IGeometryData): IGeometryData {
    this.geometries.set(id, data);
    return data;
  }
  public static get(id: string) {
    return this.geometries.get(id);
  }
}
