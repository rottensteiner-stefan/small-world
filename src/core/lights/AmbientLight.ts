import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { AbstractLight } from "./AbstractLight.js";

export class AmbientLight extends AbstractLight {
  public readonly type = LightType.AMBIENT;

  constructor(color: Color = new Color(1, 1, 1), intensity: number = 0.2) {
    super(color, intensity, "AmbientLight");
  }
}
