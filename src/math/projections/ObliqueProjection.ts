/// src/math/projections/ObliqueProjection.ts
import { Matrix4 } from "../Matrix4.js";
import { AbstractProjection } from "./AbstractProjection.js";
import { ProjectionType } from "../../enums/index.js";

/**
 * Oblique camera projection.
 */
export class ObliqueProjection extends AbstractProjection {
  /**
   * Left.
   */
  public l: number;

  /**
   * Right.
   */
  public r: number;

  /**
   * Bottom.
   */
  public b: number;

  /**
   * Top.
   */
  public t: number;

  /**
   * Near.
   */
  public n: number;

  /**
   * Far.
   */
  public f: number;

  /**
   * @inheritdoc
   */
  public override readonly type: ProjectionType = ProjectionType.OBLIQUE;

  /**
   * Creates a new ObliqueProjection.
   * @param l Left.
   * @param r Right.
   * @param b Bottom.
   * @param t Top.
   * @param n Near.
   * @param f Far.
   */
  constructor(l: number, r: number, b: number, t: number, n: number, f: number) {
    super();
    this.l = l;
    this.r = r;
    this.b = b;
    this.t = t;
    this.n = n;
    this.f = f;
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
