/// src/core/cameras/strategies/FPSStrategy.ts
import { CameraConstraints, CameraStrategy } from "../../../interfaces/index.js";
import { Camera } from "../../Camera.js";
import { CameraStrategyType } from "../../../enums/index.js";
import { Vector3D } from "../../../math/Vector3D.js";

export class FPSStrategy implements CameraStrategy {
  public readonly type = CameraStrategyType.FPS;
  public heightOffset = 0.5;
  public constraints?: CameraConstraints;

  public update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void {
    if (dx !== 0 || dy !== 0) {
      camera.theta -= dx * 0.005;
      camera.phi += dy * 0.005;
      const limit = Math.PI / 2 - 0.01;
      if (camera.phi > limit) camera.phi = limit;
      if (camera.phi < -limit) camera.phi = -limit;
    }

    camera.position.x = targetPos.x;
    camera.position.y = targetPos.y + this.heightOffset;
    camera.position.z = targetPos.z;

    // Apply constraints to position in FPS mode
    if (this.constraints) {
      if (this.constraints.min && this.constraints.max) {
        camera.position.clamp(this.constraints.min, this.constraints.max);
      } else if (this.constraints.min) {
        camera.position.x = Math.max(this.constraints.min.x, camera.position.x);
        camera.position.y = Math.max(this.constraints.min.y, camera.position.y);
        camera.position.z = Math.max(this.constraints.min.z, camera.position.z);
      } else if (this.constraints.max) {
        camera.position.x = Math.min(this.constraints.max.x, camera.position.x);
        camera.position.y = Math.min(this.constraints.max.y, camera.position.y);
        camera.position.z = Math.min(this.constraints.max.z, camera.position.z);
      }
    }

    camera.target.x = camera.position.x - Math.sin(camera.theta) * Math.cos(camera.phi);
    camera.target.y = camera.position.y - Math.sin(camera.phi);
    camera.target.z = camera.position.z - Math.cos(camera.theta) * Math.cos(camera.phi);
  }
}
