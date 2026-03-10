import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { Light } from "./Light.js";

export class AmbientLight extends Light {
  public readonly lightType = LightType.AMBIENT;

  constructor(color: Color = new Color(1, 1, 1), intensity: number = 0.2) {
    super(color, intensity, "AmbientLight");
  }
}
