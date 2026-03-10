import { Object3D } from "../Object3D.js";
import { Color } from "../colors/Color.js";
import { LightType } from "../../enums/LightType.js";

export abstract class Light extends Object3D {
  public abstract readonly lightType: LightType;

  protected constructor(
    public color: Color,
    public intensity: number,
    name: string = "Light",
  ) {
    super(name);
  }
}
