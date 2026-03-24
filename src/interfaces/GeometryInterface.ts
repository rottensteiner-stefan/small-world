/// src/interfaces/GeometryInterface.ts
import { GeometryDataInterface } from "./GeometryDataInterface.js"; // Wird gleich angepasst

export interface GeometryInterface {
  getGeometryData(): GeometryDataInterface;
}
