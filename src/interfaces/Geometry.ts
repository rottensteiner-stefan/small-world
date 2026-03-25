/// src/interfaces/Geometry.ts

import { GeometryData } from "./GeometryData.js"; // Wird gleich angepasst

export interface Geometry {
  getGeometryData(): GeometryData;
}
