import { Object3D } from "../Object3D.js";
import { Color } from "../colors/Color.js";

export class PointLight extends Object3D {
  constructor(
    public color: Color = Color.WHITE,
    public intensity: number = 1.0,
    public distance: number = 50.0,
    public decay: number = 2.0,
  ) {
    super("PointLight");
  }
}
