/// src/core/lights/DirectionalLight.ts
import { AbstractLight } from "./AbstractLight.js";
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { Vector3D } from "../../math/Vector3D.js";

export class DirectionalLight extends AbstractLight {
  public readonly type = LightType.DIRECTIONAL;

  public intensity: number = 1.0;
  public direction: Vector3D = new Vector3D(0, -1, 0).normalize();

  constructor(color: Color = Color.WHITE, intensity: number = 1.0) {
    super(color, intensity, "DirectionalLight");
  }
}
