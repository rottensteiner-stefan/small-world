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
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_specColor: this.specularColor.toFloat32Array(),
          u_shininess: this.shininess,
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
        },
        textures: {
          u_diffuseMap: this.diffuseMap,
          u_normalMap: this.normalMap,
          u_specularMap: this.specularMap,
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();
    props["u_specColor"] = this.specularColor.toFloat32Array();
    props["u_shininess"] = this.shininess;

    if (this.diffuseMap) {
      (props["u_texOffset"] as number[])[0] = this.diffuseMap.offset.x;
      (props["u_texOffset"] as number[])[1] = this.diffuseMap.offset.y;
      (props["u_texRepeat"] as number[])[0] = this.diffuseMap.repeat.x;
      (props["u_texRepeat"] as number[])[1] = this.diffuseMap.repeat.y;
    } else {
      (props["u_texOffset"] as number[])[0] = 0;
      (props["u_texOffset"] as number[])[1] = 0;
      (props["u_texRepeat"] as number[])[0] = 1;
      (props["u_texRepeat"] as number[])[1] = 1;
    }

    texs["u_diffuseMap"] = this.diffuseMap;
    texs["u_normalMap"] = this.normalMap;
    texs["u_specularMap"] = this.specularMap;

    this._renderManifest.state = {
      ...this._renderManifest.state,
      culling: this.cullMode,
    };

    return this._renderManifest;
  }
}
