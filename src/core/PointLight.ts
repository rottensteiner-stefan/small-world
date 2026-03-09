import { Object3D } from "./Object3D.js";
import { Color } from "./Color.js";

export class PointLight extends Object3D {
  // distance: Wie weit das Licht reicht. decay: Wie schnell es abfällt.
  constructor(
    public color: Color = Color.WHITE,
    public intensity: number = 1.0,
    public distance: number = 50.0,
    public decay: number = 2.0,
  ) {
    super("PointLight");
  }
}
