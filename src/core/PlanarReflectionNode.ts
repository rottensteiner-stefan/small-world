import { Object3D } from "./Object3D.js";
import { Camera } from "./Camera.js";
import { Scene } from "./Scene.js";
import { PerspectiveProjection } from "../math/projections/index.js";
import { Renderer } from "../interfaces/index.js";
import { RenderTarget } from "./textures/index.js";
import { MathPool } from "../math/index.js";

/**
 * A node that renders the scene from a mirrored perspective into a RenderTarget.
 */
export class PlanarReflectionNode extends Object3D {
  public renderTarget: RenderTarget;
  public mirrorCamera: Camera;

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

    // 1. Calculate mirror plane based on this object's world matrix. Only ever read within this
    // method (recomputed fresh every call from the current world matrix), so these live as local
    // MathPool-backed scratch values rather than instance fields.
    const pos = MathPool.acquireVector().set(0, 0, 0);
    this.worldMatrix.transformVector(pos);

    const planeNormal = MathPool.acquireVector().set(0, 1, 0);
    this.worldMatrix.transformVector(planeNormal);
    planeNormal.sub(pos).normalize();
    const planeConstant = -planeNormal.dot(pos);

    // 2. Mirror the camera position
    const camPos = mainCamera.position;
    const dist = planeNormal.dot(camPos) + planeConstant;
    this.mirrorCamera.position.set(
      camPos.x - 2.0 * planeNormal.x * dist,
      camPos.y - 2.0 * planeNormal.y * dist,
      camPos.z - 2.0 * planeNormal.z * dist,
    );

    // 3. Mirror the camera target
    const targetPos = mainCamera.target;
    const distTarget = planeNormal.dot(targetPos) + planeConstant;
    this.mirrorCamera.target.set(
      targetPos.x - planeNormal.x * 2 * distTarget,
      targetPos.y - planeNormal.y * 2 * distTarget,
      targetPos.z - planeNormal.z * 2 * distTarget,
    );

    // 4. Mirror the camera UP vector (must be set BEFORE updateViewMatrix)
    const up = mainCamera.up;
    const upDist = planeNormal.dot(up);
    this.mirrorCamera.up.set(
      up.x - 2.0 * planeNormal.x * upDist,
      up.y - 2.0 * planeNormal.y * upDist,
      up.z - 2.0 * planeNormal.z * upDist,
    );

    // Update view and projection internally
    this.mirrorCamera.updateViewMatrix();

    MathPool.releaseVector(pos);
    MathPool.releaseVector(planeNormal);

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
