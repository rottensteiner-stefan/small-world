/// src/core/materials/LambertMaterial.ts
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/index.js";
import { Color } from "../colors/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

/**
 * Configuration options for Lambert material.
 */
export interface LambertMaterialOptions {
  /** The base color of the material. Defaults to white. */
  color?: Color;
  /** The diffuse texture map. Defaults to undefined. */
  diffuseMap?: Texture | undefined;
  /** The normal texture map. Defaults to undefined. */
  normalMap?: Texture | undefined;
}

/**
 * A material that uses the Lambertian reflectance model.
 */
export class LambertMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.LAMBERT;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;
  /** The normal texture map. */
  public normalMap: Texture | undefined;

  constructor(options: LambertMaterialOptions = {}) {
    super();
    const { color = Color.WHITE, diffuseMap = undefined, normalMap = undefined } = options;
    this.color = color;
    this.diffuseMap = diffuseMap;
    this.normalMap = normalMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    return {
      shaderId: this.type,
      properties: {
        u_color: this.color.toFloat32Array(),
        u_shininess: 0.0, // Lambert is un-shiny
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
      },
    };
  }
}
