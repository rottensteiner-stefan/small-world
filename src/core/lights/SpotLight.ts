import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { Light } from "./Light.js";
import { Vector3D } from "../../math/Vector3D.js";

export class SpotLight extends Light {
  public readonly lightType = LightType.SPOT;

  public direction: Vector3D = new Vector3D(0, -1, 0).normalize();

  constructor(
    color: Color = Color.WHITE,
    intensity: number = 1.0,
    public distance: number = 50.0,
    public angle: number = Math.PI / 6, // 30 Grad Kegel
    public penumbra: number = 0.5, // 0 = harte Kante, 1 = extrem weich
    public decay: number = 2.0,
  ) {
    super(color, intensity, "SpotLight");
  }
}
