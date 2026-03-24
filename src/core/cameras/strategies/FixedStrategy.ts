/// src/core/cameras/strategies/FixedStrategy.ts
import { Camera } from "../../Camera.js";
import { CameraStrategyType } from "../../../enums/CameraStrategyType.js";
import { CameraStrategyInterface } from "../../../interfaces/CameraStrategyInterface.js";
import { Vector3D } from "../../../math/Vector3D.js";

export class FixedStrategy implements CameraStrategyInterface {
  public readonly type = CameraStrategyType.FIXED;

  public update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void {
    // Die Kamera bewegt sich nicht, sie schaut nur dem Spieler hinterher.
    camera.target.copyFrom(targetPos);
  }
}
