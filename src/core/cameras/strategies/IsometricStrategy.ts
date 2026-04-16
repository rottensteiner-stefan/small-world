/// src/core/cameras/strategies/IsometricStrategy.ts

import { CameraConstraints, CameraStrategy } from "../../../interfaces/index.js";
import { CameraInterfaceData } from "../../../interfaces/index.js";
import { Camera } from "../../Camera.js";
import { Vector3D } from "../../../math/Vector3D.js";
import { Matrix4 } from "../../../math/Matrix4.js";
import { CameraStrategyType } from "../../../enums/index.js";
import { MathUtils, OrthographicProjection } from "../../../math/index.js";

/**
 * Strategy for an isometric 2D/3D camera.
 * Uses an orthographic projection and fixed angles.
 */
export class IsometricStrategy implements CameraStrategy {
  /** @inheritdoc */
  public readonly type: string = CameraStrategyType.ISOMETRIC;

  /** Whether to snap the camera position to whole pixels. */
  public pixelPerfect: boolean = true;

  /** The snapping grid size (pixels per world unit) for pixelPerfect mode. */
  public zoom: number = 50;

  /** Optional constraints for the camera. */
  public constraints?: CameraConstraints;

  /**
   * Updates the camera position and target.
   * @param camera The camera to update.
   * @param targetPos The target position to follow.
   * @param _dx Unused.
   * @param _dy Unused.
   */
  public update(camera: Camera, targetPos: Vector3D, _dx: number, _dy: number): void {
    if (!(camera.projection instanceof OrthographicProjection)) {
      console.warn("IsometricStrategy requires an OrthographicProjection.");
      return;
    }

    // Apply constraints to targetPos clone to not affect the source object
    const constrainedTarget: Vector3D = targetPos.clone();
    if (undefined !== this.constraints) {
      if (undefined !== this.constraints.min && undefined !== this.constraints.max) {
        constrainedTarget.clamp(this.constraints.min, this.constraints.max);
      } else if (undefined !== this.constraints.min) {
        constrainedTarget.x = Math.max(this.constraints.min.x, constrainedTarget.x);
        constrainedTarget.y = Math.max(this.constraints.min.y, constrainedTarget.y);
        constrainedTarget.z = Math.max(this.constraints.min.z, constrainedTarget.z);
      } else if (undefined !== this.constraints.max) {
        constrainedTarget.x = Math.min(this.constraints.max.x, constrainedTarget.x);
        constrainedTarget.y = Math.min(this.constraints.max.y, constrainedTarget.y);
        constrainedTarget.z = Math.min(this.constraints.max.z, constrainedTarget.z);
      }
    }

    // Standard isometric angles
    // Rotation around Y: 45 degrees
    // Rotation around X (pitch): Math.asin(Math.tan(30 * Math.PI / 180)) approx 35.264 degrees
    const angleY: number = MathUtils.QUARTER_PI; // 45°
    const angleX: number = Math.atan(Math.SQRT1_2); // ~35.264°

    // Distance from target
    const distance: number = 100;

    // Calculate position based on angles
    let posX: number = constrainedTarget.x + distance * Math.sin(angleY) * Math.cos(angleX);
    let posY: number = constrainedTarget.y + distance * Math.sin(angleX);
    let posZ: number = constrainedTarget.z + distance * Math.cos(angleY) * Math.cos(angleX);

    if (this.pixelPerfect) {
      posX = Math.round(posX * this.zoom) / this.zoom;
      posY = Math.round(posY * this.zoom) / this.zoom;
      posZ = Math.round(posZ * this.zoom) / this.zoom;
    }

    camera.position.set(posX, posY, posZ);
    camera.target.copyFrom(constrainedTarget);

    camera.updateViewMatrix();
  }

  /**
   * Maps screen coordinates to world coordinates on the Y=0 plane.
   * @param screenX Normalized screen X (-1 to 1).
   * @param screenY Normalized screen Y (-1 to 1).
   * @param camera The camera used for rendering.
   * @returns The world position.
   */
  public screenToWorld(screenX: number, screenY: number, camera: CameraInterfaceData): Vector3D {
    const invVP: Matrix4 = new Matrix4();
    const vp: Matrix4 = new Matrix4();

    // Get the current projection and view matrices
    const p: Matrix4 = camera.projection.getMatrix();
    const v: Matrix4 = new Matrix4();
    Matrix4.lookAt(camera.position, camera.target, camera.up, v);

    // VP = Projection * View
    Matrix4.multiply(p, v, vp);

    // Invert VP
    if (!vp.invert(invVP)) {
      return new Vector3D();
    }

    // Unproject two points to get a ray
    // Near point (z = -1 in NDC, but for WebGL usually 0 to 1, our Matrix4.orthographic uses n/(n-f))
    // Actually NDC is -1 to 1.
    const pNear: Vector3D = new Vector3D(screenX, screenY, -1);
    const pFar: Vector3D = new Vector3D(screenX, screenY, 1);

    invVP.transformVector(pNear);
    invVP.transformVector(pFar);

    // Ray direction
    const dir: Vector3D = pFar.clone().sub(pNear).normalize();

    // Intersection with Y=0 plane: pNear + t * dir = (x, 0, z)
    // pNear.y + t * dir.y = 0  => t = -pNear.y / dir.y
    if (Math.abs(dir.y) < 0.0001) {
      return pNear; // Parallel to plane
    }

    const t: number = -pNear.y / dir.y;
    return pNear.add(dir.scale(t));
  }
}
