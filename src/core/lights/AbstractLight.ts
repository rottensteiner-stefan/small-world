import { Object3D } from "../Object3D.js";
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";

export abstract class AbstractLight extends Object3D {
  // Pflichtfeld für alle Lichter
  public abstract readonly type: LightType;

  protected constructor(
    public color: Color,
    public intensity: number,
    name: string = "Light",
  ) {
    super(name);
  }
}
