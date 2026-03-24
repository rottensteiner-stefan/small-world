/// src/core/materials/AbstractMaterial.ts
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";

/**
 * Base class for all material types.
 */
export abstract class AbstractMaterial {
  /** The type of the material. */
  public abstract readonly type: MaterialType;

  /** The unique identifier of the material. */
  public uuid: string = crypto.randomUUID();
  /** The base color of the material. */
  public color: Color = Color.WHITE;
}
