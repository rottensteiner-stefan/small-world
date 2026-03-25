/// src/core/cameras/strategies/StiffStrategy.ts
import { Camera } from "../../Camera.js";
import { CameraStrategyType } from "../../../enums/index.js";
import { CameraStrategy } from "../../../interfaces/index.js";
import { Vector3D } from "../../../math/Vector3D.js";

export class StiffStrategy implements CameraStrategy {
  public readonly type = CameraStrategyType.STIFF;
  public radius = 20;

  public update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void {
    if (dx !== 0 || dy !== 0) {
      camera.theta -= dx * 0.005;
      camera.phi += dy * 0.005;
      const limit = Math.PI / 2 - 0.01;
      if (camera.phi > limit) camera.phi = limit;
      if (camera.phi < -limit) camera.phi = -limit;
    }

    camera.target.copyFrom(targetPos);

    camera.position.x =
      camera.target.x + this.radius * Math.sin(camera.theta) * Math.cos(camera.phi);
    camera.position.y = camera.target.y + this.radius * Math.sin(camera.phi);
    camera.position.z =
      camera.target.z + this.radius * Math.cos(camera.theta) * Math.cos(camera.phi);
  }
}
