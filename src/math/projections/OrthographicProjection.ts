/// src/math/projections/OrthographicProjection.ts
import { Matrix4 } from "../Matrix4.js";
import { AbstractProjection } from "./AbstractProjection.js";
import { ProjectionType } from "../../enums/ProjectionType.js";

/**
 * Orthographic camera projection.
 */
export class OrthographicProjection extends AbstractProjection {
  /**
   * @inheritdoc
   */
  public override readonly type: ProjectionType = ProjectionType.ORTHOGRAPHIC;

  /**
   * Creates a new OrthographicProjection.
   * @param l Left.
   * @param r Right.
   * @param b Bottom.
   * @param t Top.
   * @param n Near.
   * @param f Far.
   */
  constructor(
    public l: number,
    public r: number,
    public b: number,
    public t: number,
    public n: number,
    public f: number,
  ) {
    super();
    this.update();
  }

  /**
   * @inheritdoc
   */
  public override update(): void {
    Matrix4.orthographic(this.l, this.r, this.b, this.t, this.n, this.f, this._matrix);
  }

  /**
   * @inheritdoc
   */
  public override getMatrix(): Matrix4 {
    return this._matrix;
  }
}
