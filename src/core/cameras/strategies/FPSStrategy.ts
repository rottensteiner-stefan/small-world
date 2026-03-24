/// src/core/cameras/strategies/FPSStrategy.ts
import { Camera } from "../../Camera.js";
import { CameraStrategyType } from "../../../enums/CameraStrategyType.js";
import { CameraStrategyInterface } from "../../../interfaces/CameraStrategyInterface.js";
import { Vector3D } from "../../../math/Vector3D.js";

export class FPSStrategy implements CameraStrategyInterface {
  public readonly type = CameraStrategyType.FPS;
  public heightOffset = 0.5;

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

    camera.target.x = camera.position.x - Math.sin(camera.theta) * Math.cos(camera.phi);
    camera.target.y = camera.position.y - Math.sin(camera.phi);
    camera.target.z = camera.position.z - Math.cos(camera.theta) * Math.cos(camera.phi);
  }
}
