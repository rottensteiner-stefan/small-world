/// src/core/cameras/strategies/FPSStrategy.ts

import { CameraConstraints, CameraStrategy } from "../../../interfaces/index.js";
import { Camera } from "../../Camera.js";
import { CameraStrategyType } from "../../../enums/index.js";
import { Vector3D } from "../../../math/Vector3D.js";

/**
 * A first-person camera strategy.
 */
export class FPSStrategy implements CameraStrategy {
  /** @inheritdoc */
  public readonly type: string = CameraStrategyType.FPS;
  /** The height offset from the target position. */
  public heightOffset: number = 0.0;
  /** @inheritdoc */
  public constraints?: CameraConstraints;

  /** @inheritdoc */
  public update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void {
    if (0 !== dx || 0 !== dy) {
      camera.theta -= dx * 0.005;
      camera.phi += dy * 0.005;
      const limit: number = Math.PI / 2 - 0.01;
      if (limit < camera.phi) camera.phi = limit;
      if (-limit > camera.phi) camera.phi = -limit;
    }

    // IMPORTANT FIX: In FPS mode, the user directly manipulates the camera's position (or we copy a targetPos into it).
    // However, Application.ts unconditionally calls camera.update(camera.target), which in FPS mode 
    // would mean the camera treats its own look-at point as its feet and constantly flies forward.
    // To prevent this, FPSStrategy should ONLY update the position if the provided targetPos is NOT the camera's own target.
    if (targetPos !== camera.target) {
      camera.position.x = targetPos.x;
      camera.position.y = targetPos.y + this.heightOffset;
      camera.position.z = targetPos.z;
    }

    if (undefined !== this.constraints) {
      if (undefined !== this.constraints.min && undefined !== this.constraints.max) {
        camera.position.clamp(this.constraints.min, this.constraints.max);
      } else if (undefined !== this.constraints.min) {
        camera.position.x = Math.max(this.constraints.min.x, camera.position.x);
        camera.position.y = Math.max(this.constraints.min.y, camera.position.y);
        camera.position.z = Math.max(this.constraints.min.z, camera.position.z);
      } else if (undefined !== this.constraints.max) {
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
