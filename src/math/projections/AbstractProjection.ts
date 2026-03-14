/// src/math/projections/AbstractProjection.ts
import { Matrix4 } from "../Matrix4.js";
import { ProjectionType } from "../../enums/ProjectionType.js";

export abstract class AbstractProjection {
  public abstract readonly type: ProjectionType;

  protected matrix = new Matrix4();
  public abstract getMatrix(): Matrix4;
  public abstract update(): void;
}
