import { Material } from "./Material.js";
import { Color } from "../colors/Color.js";
export class PhongMaterial extends Material {
  public readonly type = "PhongMaterial";
  public specularColor: Color = Color.WHITE;
  public shininess: number = 32.0;
}
