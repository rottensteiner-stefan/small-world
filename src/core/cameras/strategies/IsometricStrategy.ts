/// src/core/cameras/strategies/IsometricStrategy.ts

import { CameraConstraints, CameraStrategy } from "../../../interfaces/index.js";
import { CameraInterfaceData } from "../../../interfaces/index.js";
import { Camera } from "../../Camera.js";
import { Vector3D } from "../../../math/Vector3D.js";
import { Matrix4 } from "../../../math/Matrix4.js";
import { CameraStrategyType } from "../../../enums/index.js";
import { OrthographicProjection, MathPool } from "../../../math/index.js";

/**
 * Strategy for an isometric 2D/3D camera.
 * Uses an orthographic projection and fixed angles.
 */
export class IsometricStrategy implements CameraStrategy {
  public readonly type: string = CameraStrategyType.ISOMETRIC;

  public pixelPerfect: boolean = false;
  public zoom: number = 50;
  public constraints?: CameraConstraints;

  /**
   * Updates the camera position and target.
   */
  public update(camera: Camera, targetPos: Vector3D, _dx: number, _dy: number): void {
    if (!(camera.projection instanceof OrthographicProjection)) {
      return;
    }

    const constrainedTarget = MathPool.acquireVector().copyFrom(targetPos);
    if (this.constraints) {
        if (this.constraints.min) {
            constrainedTarget.x = Math.max(constrainedTarget.x, this.constraints.min.x);
            constrainedTarget.y = Math.max(constrainedTarget.y, this.constraints.min.y);
            constrainedTarget.z = Math.max(constrainedTarget.z, this.constraints.min.z);
        }
        if (this.constraints.max) {
            constrainedTarget.x = Math.min(constrainedTarget.x, this.constraints.max.x);
            constrainedTarget.y = Math.min(constrainedTarget.y, this.constraints.max.y);
            constrainedTarget.z = Math.min(constrainedTarget.z, this.constraints.max.z);
        }
    }

    // Classic Isometric Angles: 45° around Y, ~35.264° around X
    const angleY = Math.PI / 4; 
    const angleX = Math.atan(Math.SQRT1_2); 
    const distance = 100;

    let posX = constrainedTarget.x + distance * Math.sin(angleY) * Math.cos(angleX);
    let posY = constrainedTarget.y + distance * Math.sin(angleX);
    let posZ = constrainedTarget.z + distance * Math.cos(angleY) * Math.cos(angleX);

    if (this.pixelPerfect) {
      posX = Math.round(posX * this.zoom) / this.zoom;
      posY = Math.round(posY * this.zoom) / this.zoom;
      posZ = Math.round(posZ * this.zoom) / this.zoom;
    }

    camera.position.set(posX, posY, posZ);
    camera.target.copyFrom(constrainedTarget);

    camera.updateViewMatrix();
    MathPool.releaseVector(constrainedTarget);
  }

  /**
   * Maps screen coordinates to world coordinates on the Y=0 plane.
   */
  public screenToWorld(screenX: number, screenY: number, camera: CameraInterfaceData): Vector3D {
    const invVP = MathPool.acquireMatrix();
    const vp = MathPool.acquireMatrix();

    const p = camera.projection.getMatrix();
    const v = MathPool.acquireMatrix();
    Matrix4.lookAt(camera.position, camera.target, camera.up, v);

    Matrix4.multiply(p, v, vp);
    if (!vp.invert(invVP)) {
        MathPool.releaseMatrix(invVP); MathPool.releaseMatrix(vp); MathPool.releaseMatrix(v);
        return new Vector3D();
    }

    // pNear at Z=0 (Standard for modern APIs)
    const pNear = new Vector3D(screenX, screenY, 0);
    const pFar = new Vector3D(screenX, screenY, 1);

    invVP.transformVector(pNear);
    invVP.transformVector(pFar);

    const dir = pFar.clone().sub(pNear).normalize();
    
    MathPool.releaseMatrix(invVP); MathPool.releaseMatrix(vp); MathPool.releaseMatrix(v);

    if (Math.abs(dir.y) < 0.0001) return pNear;

    const t = -pNear.y / dir.y;
    return pNear.add(dir.scale(t));
  }
}
