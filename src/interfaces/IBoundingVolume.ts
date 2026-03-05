import { Vector3D } from "../math/Vector3D.js";

export enum BoundingType { SPHERE, BOX }

export interface IBoundingVolume {
  type: BoundingType;
  center: Vector3D;
  // Broad-Phase: Jedes Volumen liefert einen groben Umkreis-Radius
  getBroadRadius(): number;
}
