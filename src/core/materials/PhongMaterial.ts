// src/core/materials/PhongMaterial.ts
import { Color } from "../colors/Color.js";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Texture } from "../textures/Texture.js";

export class PhongMaterial extends AbstractMaterial {
  public static readonly type = "PhongMaterial"; // Nur noch statisch!

  public specularColor: Color = Color.WHITE;
  public shininess: number = 32.0;
  public diffuseMap: Texture | null = null;
}