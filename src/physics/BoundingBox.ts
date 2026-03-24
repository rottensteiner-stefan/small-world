/// src/physics/BoundingBox.ts
import { BoundingVolume } from "../interfaces/index.js";
import { Vector3D } from "../math/Vector3D.js";
import { BoundingType } from "../enums/index.js";
/**
 * Represents an axis-aligned bounding box (AABB).
 */
export class BoundingBox implements BoundingVolume {
  /** @inheritdoc */
  public type: BoundingType = BoundingType.BOX;
  /** The broad radius for coarse intersection tests. */
  public broadRadius: number;

  /**
   * Creates a new BoundingBox.
   * @param min The minimum coordinates.
   * @param max The maximum coordinates.
   */
  constructor(
    public min: Vector3D,
    public max: Vector3D,
  ) {
    const size: Vector3D = max.clone().sub(min);
    this.broadRadius = size.length() / 2;
  }

  /** @inheritdoc */
  public get center(): Vector3D {
    return this.min.clone().add(this.max).scale(0.5);
  }

  /** @inheritdoc */
  public getBroadRadius(): number {
    return this.broadRadius;
  }
}
