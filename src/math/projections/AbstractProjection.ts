/// src/math/projections/AbstractProjection.ts

import { Matrix4 } from "../Matrix4.js";
import { ProjectionType } from "../../enums/index.js";

/**
 * Base class for all camera projection types.
 */
export abstract class AbstractProjection {
  /** The type of the projection. */
  public abstract readonly type: ProjectionType;

  /** The projection matrix. */
  protected _matrix: Matrix4 = new Matrix4();

  /**
   * Returns the calculated projection matrix.
   * @returns The projection matrix.
   */
  public abstract getMatrix(): Matrix4;

  /**
   * Updates the projection matrix based on current properties.
   */
  public abstract update(): void;
}
