/// src/core/cameras/strategies/FixedStrategy.ts
import { Camera } from "../../Camera.js";
import { CameraStrategyType } from "../../../enums/index.js";
import { CameraConstraints, CameraStrategy } from "../../../interfaces/index.js";
import { Vector3D } from "../../../math/Vector3D.js";

export class FixedStrategy implements CameraStrategy {
  public readonly type = CameraStrategyType.FIXED;
  public constraints?: CameraConstraints;

  public update(camera: Camera, targetPos: Vector3D, _dx: number, _dy: number): void {
    // Die Kamera bewegt sich nicht, sie schaut nur dem Spieler hinterher.
    camera.target.copyFrom(targetPos);

    // Apply constraints to target
    if (this.constraints) {
      if (this.constraints.min && this.constraints.max) {
        camera.target.clamp(this.constraints.min, this.constraints.max);
      } else if (this.constraints.min) {
        camera.target.x = Math.max(this.constraints.min.x, camera.target.x);
        camera.target.y = Math.max(this.constraints.min.y, camera.target.y);
        camera.target.z = Math.max(this.constraints.min.z, camera.target.z);
      } else if (this.constraints.max) {
        camera.target.x = Math.min(this.constraints.max.x, camera.target.x);
        camera.target.y = Math.min(this.constraints.max.y, camera.target.y);
        camera.target.z = Math.min(this.constraints.max.z, camera.target.z);
      }
    }
  }
}
