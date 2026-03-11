import { Color } from "../colors/Color.js";

export abstract class AbstractMaterial {
  public uuid: string = crypto.randomUUID();
  public color: Color = Color.WHITE;
}
