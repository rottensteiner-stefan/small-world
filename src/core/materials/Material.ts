import { Color } from "../colors/Color.js";

export abstract class Material {
  public uuid: string = crypto.randomUUID();
  public color: Color = Color.WHITE;
  public abstract readonly type: string;
}
