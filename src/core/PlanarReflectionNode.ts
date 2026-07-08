/// src/core/PlanarReflectionNode.ts
import { Object3D } from "./Object3D.js";
import { Camera } from "./Camera.js";
import { Scene } from "./Scene.js";
import { PerspectiveProjection } from "../math/projections/index.js";
import { Renderer } from "../interfaces/index.js";
import { RenderTarget } from "./textures/index.js";
import { Vector3D } from "../math/index.js";

/**
 * A node that renders the scene from a mirrored perspective into a RenderTarget.
 */
export class PlanarReflectionNode extends Object3D {
  public renderTarget: RenderTarget;
  public mirrorCamera: Camera;

  private _planeNormal: Vector3D = new Vector3D(0, 1, 0);
  private _planeConstant: number = 0; // Distance from origin

  constructor(name: string = "PlanarReflectionNode", width: number = 1024, height: number = 1024) {
    super(name);
    this.renderTarget = RenderTarget.create({ width, height });
    this.mirrorCamera = new Camera(new PerspectiveProjection());
  }

  /**
   * Updates the reflection texture by rendering the scene from a mirrored camera.
   * Call this in your update loop before the main render.
   */
  public updateReflection(scene: Scene, mainCamera: Camera, renderer: Renderer): void {
    if (!mainCamera.projection) return;
    this.mirrorCamera.aspect = mainCamera.aspect;
    this.mirrorCamera.projection = mainCamera.projection;

    // 1. Calculate mirror plane based on this object's world matrix
    const pos = new Vector3D(0, 0, 0);
    this.worldMatrix.transformVector(pos);

    const normalPoint = new Vector3D(0, 1, 0);
    this.worldMatrix.transformVector(normalPoint);
    this._planeNormal = normalPoint.sub(pos).normalize();
    this._planeConstant = -this._planeNormal.dot(pos);

    // 2. Mirror the camera position
    const camPos = mainCamera.position;
    const dist = this._planeNormal.dot(camPos) + this._planeConstant;
    this.mirrorCamera.position.set(
      camPos.x - 2.0 * this._planeNormal.x * dist,
      camPos.y - 2.0 * this._planeNormal.y * dist,
      camPos.z - 2.0 * this._planeNormal.z * dist,
    );

    // 3. Mirror the camera target
    const targetPos = mainCamera.target.clone();
    const distTarget = this._planeNormal.dot(targetPos) + this._planeConstant;
    const mirroredTarget = new Vector3D(targetPos.x, targetPos.y, targetPos.z).sub(
      new Vector3D(
        this._planeNormal.x * 2 * distTarget,
        this._planeNormal.y * 2 * distTarget,
        this._planeNormal.z * 2 * distTarget,
      ),
    );
    this.mirrorCamera.target.copyFrom(mirroredTarget);

    // Update view and projection internally
    this.mirrorCamera.updateViewMatrix();

    // 4. Mirror the camera UP vector
    const up = mainCamera.up;
    const upDist = this._planeNormal.dot(up);
    this.mirrorCamera.up.set(
      up.x - 2.0 * this._planeNormal.x * upDist,
      up.y - 2.0 * this._planeNormal.y * upDist,
      up.z - 2.0 * this._planeNormal.z * upDist,
    );

    // 5. Hide this reflection node (and its children) so it doesn't occlude the reflection
    const wasVisible = this.isVisible;
    this.isVisible = false;

    // 6. Render to target
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(
      scene,
      this.mirrorCamera.viewProjectionMatrix,
      this.mirrorCamera.position,
      this.mirrorCamera.viewMatrix,
    );
    renderer.setRenderTarget(null);

    // Restore visibility
    this.isVisible = wasVisible;
  }
}
