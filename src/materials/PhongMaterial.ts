import { Material } from "./Material.js";
import { Color } from "../core/Color.js";

export class PhongMaterial extends Material {
  public readonly type = "PhongMaterial";
  public specularColor: Color = Color.WHITE;
  public shininess: number = 32.0; // Je höher, desto kleiner und schärfer der Glanzpunkt
}
