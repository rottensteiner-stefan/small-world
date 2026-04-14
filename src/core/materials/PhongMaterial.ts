/// src/core/materials/PhongMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

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
  /** The normal map texture. Defaults to undefined. */
  normalMap?: Texture | undefined;
  /** The specular map texture. Defaults to undefined. */
  specularMap?: Texture | undefined;
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

  /** The normal map texture. */
  public normalMap: Texture | undefined;

  /** The specular map texture. */
  public specularMap: Texture | undefined;

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
      normalMap = undefined,
      specularMap = undefined,
    } = options;
    this.color = color;
    this.specularColor = specularColor;
    this.shininess = shininess;
    this.diffuseMap = diffuseMap;
    this.normalMap = normalMap;
    this.specularMap = specularMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    return {
      shaderId: this.type,
      properties: {
        u_color: this.color.toArray(),
        u_specColor: this.specularColor.toArray(),
        u_shininess: this.shininess,
        u_texOffset: this.diffuseMap
          ? [this.diffuseMap.offset.x, this.diffuseMap.offset.y]
          : [0, 0],
        u_texRepeat: this.diffuseMap
          ? [this.diffuseMap.repeat.x, this.diffuseMap.repeat.y]
          : [1, 1],
      },
      textures: {
        u_diffuseMap: this.diffuseMap,
        u_normalMap: this.normalMap,
        u_specularMap: this.specularMap,
      },
    };
  }
}
