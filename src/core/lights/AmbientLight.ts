/// src/core/lights/AmbientLight.ts
import { AbstractLight } from "./AbstractLight.js";
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";

/**
 * Ambient light that illuminates all objects in the scene equally.
 */
export class AmbientLight extends AbstractLight {
  /** @inheritdoc */
  public override readonly type: LightType = LightType.AMBIENT;

  /**
   * Creates a new AmbientLight.
   * @param color The color of the light.
   * @param intensity The intensity of the light.
   */
  constructor(color: Color = Color.WHITE, intensity: number = 0.2) {
    super(color, intensity, "AmbientLight");
  }
}
