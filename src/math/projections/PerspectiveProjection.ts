/// src/math/projections/PerspectiveProjection.ts
import { Matrix4 } from "../Matrix4.js";
import { AbstractProjection } from "./AbstractProjection.js";
import { ProjectionType } from "../../enums/ProjectionType.js";

/**
 * Perspective camera projection.
 */
export class PerspectiveProjection extends AbstractProjection {
  /**
   * Field of view in radians.
   */
  public fov: number;

  /**
   * Aspect ratio.
   */
  public aspect: number;

  /**
   * Near plane.
   */
  public near: number;

  /**
   * Far plane.
   */
  public far: number;

  /**
   * @inheritdoc
   */
  public override readonly type: ProjectionType = ProjectionType.PERSPECTIVE;

  /**
   * Creates a new PerspectiveProjection.
   * @param fov Field of view in radians.
   * @param aspect Aspect ratio.
   * @param near Near plane.
   * @param far Far plane.
   */
  constructor(fov: number, aspect: number, near: number, far: number) {
    super();
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.update();
  }

  /**
   * @inheritdoc
   */
  public override update(): void {
    Matrix4.perspective(this.fov, this.aspect, this.near, this.far, this._matrix);
  }

  /**
   * @inheritdoc
   */
  public override getMatrix(): Matrix4 {
    return this._matrix;
  }
}
