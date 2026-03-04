import { IGeometryData } from "./IGeometryData.js";

export interface IGeometry {
  /**
   * Liefert die für den Renderer aufbereiteten Geometriedaten.
   */
  getGeometryData(): IGeometryData;
}
