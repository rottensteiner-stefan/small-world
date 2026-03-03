import { Projection } from "./Projection.js";
import { Matrix4 } from "../Matrix4.js";
export class OrthographicProjection extends Projection {
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
  public update(): void {
    Matrix4.orthographic(this.l, this.r, this.b, this.t, this.n, this.f, this.matrix);
  }
  public getMatrix(): Matrix4 {
    return this.matrix;
  }
}
