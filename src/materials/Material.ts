import { Color } from "../core/Color.js";

export abstract class Material {
  public uuid: string = crypto.randomUUID();
  public color: Color = Color.WHITE;

  // Zwingt Unterklassen, ihren Typ preiszugeben
  public abstract get type(): string;
}
