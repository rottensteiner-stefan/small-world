import { AbstractMaterial } from "./index.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";

export class PhongMaterial extends AbstractMaterial {
  public readonly type = MaterialType.PHONG;
  public specularColor: Color = Color.WHITE;
  public shininess: number = 32.0;
  public diffuseMap: Texture | null = null;
}
