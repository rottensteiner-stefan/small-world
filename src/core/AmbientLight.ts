import { Object3D } from "./Object3D.js";
import { Color } from "./Color.js";

export class AmbientLight extends Object3D {
  constructor(
    public color: Color = new Color(1, 1, 1),
    public intensity: number = 0.2,
  ) {
    super("AmbientLight");
  }
}
