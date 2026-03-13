/// src/core/lights/AreaLight.ts
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { AbstractLight } from "./AbstractLight.js";

export class AreaLight extends AbstractLight {
  public readonly type = LightType.AREA;

  constructor(
    color: Color = Color.WHITE,
    intensity: number = 1.0,
    public width: number = 5.0, // Breite der Leuchtfläche
    public height: number = 5.0, // Höhe/Länge der Leuchtfläche
  ) {
    super(color, intensity, "AreaLight");
  }
}
