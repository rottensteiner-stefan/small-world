import { Color } from "../colors/Color.js";
import { MaterialType } from "../../enums/MaterialType.js";

export abstract class AbstractMaterial {
  // Jede Unterklasse MUSS diesen Typ setzen
  public abstract readonly type: MaterialType;

  public uuid: string = crypto.randomUUID();
  public color: Color = Color.WHITE;
}
