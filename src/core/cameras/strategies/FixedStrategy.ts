import { ICameraStrategy } from "../../../interfaces/ICameraStrategy.js";
import { Camera } from "../../Camera.js";
import { Vector3D } from "../../../math/Vector3D.js";

export class FixedStrategy implements ICameraStrategy {
  public readonly type = "FIXED";

  public update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void {
    // Die Kamera bewegt sich nicht, sie schaut nur dem Spieler hinterher.
    camera.target.copyFrom(targetPos);
  }
}
