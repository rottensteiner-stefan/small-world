/// src/math/projections/OrthographicProjection.ts

import { Matrix4 } from "../Matrix4.js";
import { AbstractProjection } from "./AbstractProjection.js";
import { ProjectionType } from "../../enums/index.js";

/**
 * Configuration options for orthographic projection.
 */
export interface OrthographicOptions {
  left?: number;
  right?: number;
  bottom?: number;
  top?: number;
  near?: number;
  far?: number;
}

/**
 * Modern Orthographic projection implementation.
 */
export class OrthographicProjection extends AbstractProjection {
  public left: number;
  public right: number;
  public bottom: number;
  public top: number;
  public near: number;
  public far: number;

  public override readonly type: ProjectionType = ProjectionType.ORTHOGRAPHIC;

  constructor(options: OrthographicOptions = {}) {
    super();
    this.left = options.left ?? -1;
    this.right = options.right ?? 1;
    this.bottom = options.bottom ?? -1;
    this.top = options.top ?? 1;
    this.near = options.near ?? 0.1;
    this.far = options.far ?? 1000;
    this.update();
  }

  public override update(): void {
    Matrix4.orthographic(
      this.left,
      this.right,
      this.bottom,
      this.top,
      this.near,
      this.far,
      this._matrix,
    );
  }

  public override getMatrix(): Matrix4 {
    return this._matrix;
  }
}
