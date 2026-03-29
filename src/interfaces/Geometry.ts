/// src/interfaces/Geometry.ts

import { GeometryDataInterface } from "./GeometryData.js";

/**
 * Interface for all geometry types.
 */
export interface Geometry {
  /**
   * Returns the geometry data.
   * @returns The geometry data.
   */
  getGeometryData(): GeometryDataInterface;
}
