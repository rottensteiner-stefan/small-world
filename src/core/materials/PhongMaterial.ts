/// src/core/materials/PhongMaterial.ts

import { AbstractMaterial } from "./index.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";

/**
 * Configuration options for Phong material.
 */
export interface PhongMaterialOptions {
  /** The base color of the material. Defaults to white. */
  color?: Color;
  /** The specular reflection color. Defaults to white. */
  specularColor?: Color;
  /** The shininess factor. Defaults to 32.0. */
  shininess?: number;
  /** The diffuse texture map. Defaults to undefined. */
  diffuseMap?: Texture | undefined;
}

/**
 * Material that implements the Phong reflection model.
 */
export class PhongMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.PHONG;

  /** The specular reflection color. */
  public specularColor: Color;

  /** The shininess factor. */
  public shininess: number;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  /**
   * Creates a new PhongMaterial.
   * @param options The configuration options for the material.
   */
  constructor(options: PhongMaterialOptions = {}) {
    super();
    const {
      color = Color.WHITE,
      specularColor = Color.WHITE,
      shininess = 32.0,
      diffuseMap = undefined,
    } = options;
    this.color = color;
    this.specularColor = specularColor;
    this.shininess = shininess;
    this.diffuseMap = diffuseMap;
  }
}
