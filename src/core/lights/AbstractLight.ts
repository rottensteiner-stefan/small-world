/// src/core/lights/AbstractLight.ts
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { Object3D } from "../Object3D.js";

/**
 * Base class for all light types.
 */
export abstract class AbstractLight extends Object3D {
  /** The type of the light. */
  public abstract readonly type: LightType;

  /**
   * Creates a new AbstractLight.
   * @param color The color of the light.
   * @param intensity The intensity of the light.
   * @param name The name of the light object.
   */
  protected constructor(
    public color: Color = Color.WHITE,
    public intensity: number = 1.0,
    name: string = "Light",
  ) {
    super(name);
  }
}
