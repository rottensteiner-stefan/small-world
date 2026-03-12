import { Color } from "../colors/Color.js";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Texture } from "../textures/Texture.js";
import { MaterialType } from "../../enums/MaterialType.js";

export class PhongMaterial extends AbstractMaterial {
  public readonly type = MaterialType.PHONG;
  public specularColor: Color = Color.WHITE;
  public shininess: number = 32.0;
  public diffuseMap: Texture | null = null;
}
