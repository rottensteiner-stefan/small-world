import { ICameraStrategy } from "../../../interfaces/ICameraStrategy.js";
import { Camera } from "../../Camera.js";
import { Vector3D } from "../../../math/Vector3D.js";

export class SmoothStrategy implements ICameraStrategy {
  public readonly type = "SMOOTH";
  public radius = 20;
  public lerpFactor = 0.1;

  public update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void {
    if (dx !== 0 || dy !== 0) {
      camera.theta -= dx * 0.005;
      camera.phi += dy * 0.005;
      const limit = Math.PI / 2 - 0.01;
      if (camera.phi > limit) camera.phi = limit;
      if (camera.phi < -limit) camera.phi = -limit;
    }

    camera.target.copyFrom(targetPos);

    const idealX = camera.target.x + this.radius * Math.sin(camera.theta) * Math.cos(camera.phi);
    const idealY = camera.target.y + this.radius * Math.sin(camera.phi);
    const idealZ = camera.target.z + this.radius * Math.cos(camera.theta) * Math.cos(camera.phi);

    camera.position.x += (idealX - camera.position.x) * this.lerpFactor;
    camera.position.y += (idealY - camera.position.y) * this.lerpFactor;
    camera.position.z += (idealZ - camera.position.z) * this.lerpFactor;
  }
}
