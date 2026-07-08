/// src/core/cameras/strategies/SmoothStrategy.ts
import { CameraInterfaceData } from "../../../interfaces/index.js";
import { CameraStrategyType } from "../../../enums/index.js";
import { CameraConstraints } from "../../../interfaces/index.js";
import { CameraStrategy } from "../../../interfaces/index.js";
import { Vector3D } from "../../../math/index.js";
import { MathUtils } from "../../../math/index.js";

/**
 * A camera strategy that smoothly follows a target.
 */
export class SmoothStrategy implements CameraStrategy {
  /** @inheritdoc */
  public readonly type: string = CameraStrategyType.SMOOTH;
  /** The radius of the camera from the target. */
  public radius: number = 20;
  /** Minimum allowed radius. */
  public minRadius: number = 2;
  /** Maximum allowed radius. */
  public maxRadius: number = 500;
  /** The lerp factor for smoothing. */
  public lerpFactor: number = 0.1;
  /** @inheritdoc */
  public constraints?: CameraConstraints;

  /** @inheritdoc */
  public update(camera: CameraInterfaceData, targetPos: Vector3D, dx: number, dy: number): void {
    if (0 !== dx || 0 !== dy) {
      camera.theta -= dx * 0.005;
      camera.phi += dy * 0.005;
      const limit: number = MathUtils.HALF_PI - 0.01;
      if (limit < camera.phi) camera.phi = limit;
      if (-limit > camera.phi) camera.phi = -limit;
    }

    camera.target.x += (targetPos.x - camera.target.x) * this.lerpFactor;
    camera.target.y += (targetPos.y - camera.target.y) * this.lerpFactor;
    camera.target.z += (targetPos.z - camera.target.z) * this.lerpFactor;

    if (undefined !== this.constraints) {
      if (undefined !== this.constraints.min && undefined !== this.constraints.max) {
        camera.target.clamp(this.constraints.min, this.constraints.max);
      } else if (undefined !== this.constraints.min) {
        camera.target.x = Math.max(this.constraints.min.x, camera.target.x);
        camera.target.y = Math.max(this.constraints.min.y, camera.target.y);
        camera.target.z = Math.max(this.constraints.min.z, camera.target.z);
      } else if (undefined !== this.constraints.max) {
        camera.target.x = Math.min(this.constraints.max.x, camera.target.x);
        camera.target.y = Math.min(this.constraints.max.y, camera.target.y);
        camera.target.z = Math.min(this.constraints.max.z, camera.target.z);
      }
    }

    camera.position.x =
      camera.target.x + this.radius * Math.sin(camera.theta) * Math.cos(camera.phi);
    camera.position.y = camera.target.y + this.radius * Math.sin(camera.phi);
    camera.position.z =
      camera.target.z + this.radius * Math.cos(camera.theta) * Math.cos(camera.phi);
  }

  /** @inheritdoc */
  public zoom(_camera: CameraInterfaceData, delta: number): boolean {
    this.radius += delta * this.radius;
    this.radius = MathUtils.clamp(this.radius, this.minRadius, this.maxRadius);
    return true;
  }
}
