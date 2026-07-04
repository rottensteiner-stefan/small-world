/// src/core/behaviors/LookAtBehavior.ts

import { Behavior } from "./Behavior.js";
import { Object3D } from "../Object3D.js";
import { Vector3D } from "../../math/Vector3D.js";

/**
 * Constantly rotates the object to face a target position or another object.
 * Perfect for surveillance cameras, NPC tracking, or simple 2D billboards.
 */
export class LookAtBehavior extends Behavior {
  public targetPoint: Vector3D | Object3D;

  constructor(targetPoint: Vector3D | Object3D) {
    super();
    this.targetPoint = targetPoint;
  }

  public override update(_deltaTime: number): void {
    if (this.target && this.target instanceof Object3D) {
      const targetPos =
        this.targetPoint instanceof Object3D ? this.targetPoint.position : this.targetPoint;

      const dx = targetPos.x - this.target.position.x;
      const dy = targetPos.y - this.target.position.y;
      const dz = targetPos.z - this.target.position.z;

      // The engine uses a Right-Handed system where -Z is forward.
      const yaw = Math.atan2(dx, -dz);
      const pitch = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz));

      this.target.rotation.set(pitch, yaw, 0);
    }
  }
}
