/// src/interfaces/CameraStrategy.ts
import { Camera } from "../core/Camera.js";
import { Vector3D } from "../math/Vector3D.js";
import { CameraConstraints } from "./CameraConstraints.js";

export interface CameraStrategy {
  readonly type: string;
  /** Optional constraints for the camera. */
  constraints?: CameraConstraints | undefined;
  update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}
