import { Light } from "./Light.js";
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";

export class PointLight extends Light {
  public readonly lightType = LightType.POINT;

  constructor(
    color: Color = Color.WHITE,
    intensity: number = 1.0,
    public distance: number = 50.0,
    public decay: number = 2.0,
  ) {
    super(color, intensity, "PointLight");
  }
}
