/// src/math/projections/PerspectiveProjection.ts
import { Matrix4 } from "../Matrix4.js";
import { AbstractProjection } from "./AbstractProjection.js";
import { ProjectionType } from "../../enums/ProjectionType.js";

export class PerspectiveProjection extends AbstractProjection {
  public readonly type = ProjectionType.PERSPECTIVE;

  constructor(
    public fov: number,
    public aspect: number,
    public near: number,
    public far: number,
  ) {
    super();
    this.update();
  }
  public update(): void {
    Matrix4.perspective(this.fov, this.aspect, this.near, this.far, this.matrix);
  }
  public getMatrix(): Matrix4 {
    return this.matrix;
  }
}
