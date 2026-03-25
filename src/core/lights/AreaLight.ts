/// src/core/lights/AreaLight.ts

import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/index.js";
import { AbstractLight } from "./AbstractLight.js";

/**
 * Area light that emits light from a rectangular plane.
 */
export class AreaLight extends AbstractLight {
  /** @inheritdoc */
  public override readonly type: LightType = LightType.AREA;

  /**
   * Creates a new AreaLight.
   * @param color The color of the light.
   * @param intensity The intensity of the light.
   * @param width The width of the light area.
   * @param height The height/length of the light area.
   * @param name The name of the light object.
   */
  constructor(
    color: Color = Color.WHITE,
    intensity: number = 1.0,
    public width: number = 5.0,
    public height: number = 5.0,
    name: string = "AreaLight",
  ) {
    super(color, intensity, name);
  }
}
