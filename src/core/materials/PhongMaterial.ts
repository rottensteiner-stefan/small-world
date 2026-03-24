/// src/core/materials/PhongMaterial.ts
import { AbstractMaterial } from "./index.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";

/**
 * Material that implements the Phong reflection model.
 */
export class PhongMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.PHONG;
  /** The specular reflection color. */
  public specularColor: Color = Color.WHITE;
  /** The shininess factor. */
  public shininess: number = 32.0;
  /** The diffuse texture map. */
  public diffuseMap: Texture | null = null;
}
