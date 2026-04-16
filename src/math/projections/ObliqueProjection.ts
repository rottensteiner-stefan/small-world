/// src/math/projections/ObliqueProjection.ts

import { Matrix4 } from "../Matrix4.js";
import { AbstractProjection } from "./AbstractProjection.js";
import { ProjectionType } from "../../enums/index.js";

/**
 * Configuration options for oblique projection.
 */
export interface ObliqueOptions {
  /** Left plane distance. Defaults to -1. */
  left?: number;
  /** Right plane distance. Defaults to 1. */
  right?: number;
  /** Bottom plane distance. Defaults to -1. */
  bottom?: number;
  /** Top plane distance. Defaults to 1. */
  top?: number;
  /** Near plane distance. Defaults to 0.1. */
  near?: number;
  /** Far plane distance. Defaults to 1000. */
  far?: number;
}

/**
 * Oblique camera projection for specialized 2.5D views.
 */
export class ObliqueProjection extends AbstractProjection {
  /** Left clip plane. */
  public left: number;
  /** Right clip plane. */
  public right: number;
  /** Bottom clip plane. */
  public bottom: number;
  /** Top clip plane. */
  public top: number;
  /** Near clip plane. */
  public near: number;
  /** Far clip plane. */
  public far: number;

  /** @inheritdoc */
  public override readonly type: ProjectionType = ProjectionType.OBLIQUE;

  /**
   * Creates a new ObliqueProjection.
   * @param options The configuration options.
   */
  constructor(options: ObliqueOptions = {}) {
    super();
    const { left = -1, right = 1, bottom = -1, top = 1, near = 0.1, far = 1000 } = options;
    this.left = left;
    this.right = right;
    this.bottom = bottom;
    this.top = top;
    this.near = near;
    this.far = far;
    this.update();
  }

  /** @inheritdoc */
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

  /** @inheritdoc */
  public override getMatrix(): Matrix4 {
    return this._matrix;
  }
}
