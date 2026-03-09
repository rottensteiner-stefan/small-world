import { Color } from "../core/Color.js";

export abstract class Material {
  public uuid: string = crypto.randomUUID();
  public color: Color = Color.WHITE;

  // Zwingt Unterklassen, ihren Typ als Eigenschaft festzulegen
  public abstract readonly type: string;
}
