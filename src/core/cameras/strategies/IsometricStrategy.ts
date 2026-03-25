/// src/core/cameras/strategies/IsometricStrategy.ts
import { CameraStrategyInterface } from "../../../interfaces/CameraStrategyInterface.js";
import { CameraInterface } from "../../../interfaces/CameraInterface.js";
import { Camera } from "../../Camera.js";
import { Vector3D } from "../../../math/Vector3D.js";
import { Matrix4 } from "../../../math/Matrix4.js";
import { CameraStrategyType } from "../../../enums/CameraStrategyType.js";
import { OrthographicProjection } from "../../../math/projections/OrthographicProjection.js";

/**
 * Strategy for an isometric 2D/3D camera.
 * Uses an orthographic projection and fixed angles.
 */
export class IsometricStrategy implements CameraStrategyInterface {
  /** @inheritdoc */
  public readonly type: string = CameraStrategyType.ISOMETRIC;

  /** Whether to snap the camera position to whole pixels. */
  public pixelPerfect: boolean = true;

  /** The zoom level (world units per screen unit). */
  public zoom: number = 50;

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

    // Standard isometric angles
    // Rotation around Y: 45 degrees
    // Rotation around X (pitch): Math.asin(Math.tan(30 * Math.PI / 180)) approx 35.264 degrees
    const angleY: number = Math.PI / 4; // 45°
    const angleX: number = Math.atan(Math.SQRT1_2); // ~35.264°

    // Distance from target
    const distance: number = 100;

    // Calculate position based on angles
    let posX: number = targetPos.x + distance * Math.sin(angleY) * Math.cos(angleX);
    let posY: number = targetPos.y + distance * Math.sin(angleX);
    let posZ: number = targetPos.z + distance * Math.cos(angleY) * Math.cos(angleX);

    if (this.pixelPerfect) {
      posX = Math.round(posX * this.zoom) / this.zoom;
      posY = Math.round(posY * this.zoom) / this.zoom;
      posZ = Math.round(posZ * this.zoom) / this.zoom;
    }

    camera.position.set(posX, posY, posZ);
    camera.target.copyFrom(targetPos);

    // Update projection based on zoom
    const proj: OrthographicProjection = camera.projection;
    // We assume aspect ratio is handled elsewhere or we use fixed bounds
    // In a real scenario, we'd use the current canvas aspect ratio
    const halfWidth: number = 10; 
    const halfHeight: number = 10;

    proj.l = -halfWidth;
    proj.r = halfWidth;
    proj.b = -halfHeight;
    proj.t = halfHeight;
    proj.update();

    camera.updateViewMatrix();
  }

  /**
   * Maps screen coordinates to world coordinates on the Y=0 plane.
   * @param screenX Normalized screen X (-1 to 1).
   * @param screenY Normalized screen Y (-1 to 1).
   * @param camera The camera used for rendering.
   * @returns The world position.
   */
  public screenToWorld(screenX: number, screenY: number, camera: CameraInterface): Vector3D {
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
