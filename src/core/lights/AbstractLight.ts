/// src/core/lights/AbstractLight.ts
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";
import { Object3D } from "../Object3D.js";

export abstract class AbstractLight extends Object3D {
  // Pflichtfeld für alle Lichter
  public abstract readonly type: LightType;

  protected constructor(
    public color: Color = Color.WHITE,
    public intensity: number,
    name: string = "Light",
  ) {
    super(name);
  }
}
