/// src/interfaces/CameraStrategy.ts
import { Camera } from "../core/Camera.js";
import { Vector3D } from "../math/Vector3D.js";

export interface CameraStrategy {
  readonly type: string;
  update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}
