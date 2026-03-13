import { AbstractLight } from "./AbstractLight.js";
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";

export class AmbientLight extends AbstractLight {
  public readonly type = LightType.AMBIENT;

  constructor(color: Color = Color.WHITE, intensity: number = 0.2) {
    super(color, intensity, "AmbientLight");
  }
}
