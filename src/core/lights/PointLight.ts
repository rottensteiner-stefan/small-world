/// src/core/lights/PointLight.ts

import { AbstractLight } from "./AbstractLight.js";
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/index.js";

/**
 * Point light that emits light in all directions from a single point.
 */
export class PointLight extends AbstractLight {
  /** @inheritdoc */
  public override readonly type: LightType = LightType.POINT;

  /**
   * Creates a new PointLight.
   * @param color The color of the light.
   * @param intensity The intensity of the light.
   * @param distance The maximum distance of the light.
   * @param decay The decay factor of the light.
   * @param name The name of the light object.
   */
  constructor(
    color: Color = Color.WHITE,
    intensity: number = 1.0,
    public distance: number = 50.0,
    public decay: number = 2.0,
    name: string = "PointLight",
  ) {
    super(color, intensity, name);
  }
}
