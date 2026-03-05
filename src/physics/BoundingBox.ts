import { IBoundingVolume, BoundingType } from "../interfaces/IBoundingVolume.js";
import { Vector3D } from "../math/Vector3D.js";

export class BoundingBox implements IBoundingVolume {
  public type = BoundingType.BOX;
  public broadRadius: number;

  constructor(
    public min: Vector3D,
    public max: Vector3D,
  ) {
    // Der Broad-Radius ist die Distanz vom Zentrum zu einer Ecke
    const size = max.clone().sub(min);
    this.broadRadius = size.length() / 2;
  }

  public get center(): Vector3D {
    return this.min.clone().add(this.max).scale(0.5);
  }

  public getBroadRadius(): number {
    return this.broadRadius;
  }
}
