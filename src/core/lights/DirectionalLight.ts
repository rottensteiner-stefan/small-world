import { Color } from "../colors/Color.js";
import { Vector3D } from "../../math/Vector3D.js";
import { LightType } from "../../enums/LightType.js";
import { Light } from "./Light.js";

export class DirectionalLight extends Light {
  public readonly lightType = LightType.DIRECTIONAL;

  public intensity: number = 1.0;
  public direction: Vector3D = new Vector3D(0, -1, 0);

  constructor(color: Color = Color.WHITE, intensity: number = 1.0) {
    super(color, intensity, "DirectionalLight");
  }
}
