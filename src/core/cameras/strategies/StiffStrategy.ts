/// src/core/cameras/strategies/StiffStrategy.ts
import {
  CameraInterfaceData,
  CameraConstraints,
  CameraStrategy,
} from "../../../interfaces/index.js";
import { CameraStrategyType } from "../../../enums/index.js";
import { Vector3D, MathUtils } from "../../../math/index.js";
/**
 * A camera strategy that rigidly follows a target.
 */
export class StiffStrategy implements CameraStrategy {
  /** @inheritdoc */
  public readonly type: string = CameraStrategyType.STIFF;
  /** The radius of the camera from the target. */
  public radius: number = 20;
  /** Minimum allowed radius. */
  public minRadius: number = 2;
  /** Maximum allowed radius. */
  public maxRadius: number = 500;
  /** @inheritdoc */
  public constraints?: CameraConstraints;

  private _isInitialized: boolean = false;

  /** @inheritdoc */
  public update(camera: CameraInterfaceData, targetPos: Vector3D, dx: number, dy: number): void {
    if (!this._isInitialized) {
      const relX = camera.position.x - targetPos.x;
      const relY = camera.position.y - targetPos.y;
      const relZ = camera.position.z - targetPos.z;
      this.radius = Math.max(
        this.minRadius,
        Math.min(this.maxRadius, Math.sqrt(relX * relX + relY * relY + relZ * relZ)),
      );
      if (this.radius > 0.0001) {
        camera.theta = Math.atan2(relX, relZ);
        camera.phi = Math.asin(relY / this.radius);
      }
      this._isInitialized = true;
    }

    if (0 !== dx || 0 !== dy) {
      camera.theta -= dx * 0.005;
      camera.phi += dy * 0.005;
      const limit: number = MathUtils.HALF_PI - 0.01;
      if (limit < camera.phi) camera.phi = limit;
      if (-limit > camera.phi) camera.phi = -limit;
    }

    camera.target.copyFrom(targetPos);

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
