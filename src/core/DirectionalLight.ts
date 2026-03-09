import { Object3D } from "./Object3D.js";
import { Color } from "./Color.js";
import { Vector3D } from "../math/Vector3D.js";

export class DirectionalLight extends Object3D {
  public intensity: number = 1.0;
  public direction: Vector3D = new Vector3D(0, -1, 0);

  constructor(
    public color: Color = Color.WHITE,
    intensity: number = 1.0,
  ) {
    super("DirectionalLight");
    this.intensity = intensity;
  }
}
