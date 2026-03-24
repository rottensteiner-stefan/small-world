/// src/physics/BoundingBox.ts
import { BoundingVolume } from "../interfaces/index.js";
import { Vector3D } from "../math/Vector3D.js";
import { BoundingType } from "../enums/index.js";
export class BoundingBox implements BoundingVolume {
  public type = BoundingType.BOX;
  public broadRadius: number;
  constructor(
    public min: Vector3D,
    public max: Vector3D,
  ) {
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
