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
}

/**
 * A material that uses the Lambertian reflectance model.
 */
export class LambertMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.LAMBERT;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  constructor(options: LambertMaterialOptions = {}) {
    super();
    const { color = Color.WHITE, diffuseMap = undefined } = options;
    this.color = color;
    this.diffuseMap = diffuseMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    return {
      shaderId: this.type,
      properties: {
        u_color: this.color,
        u_shininess: 0.0, // Lambert is un-shiny
      },
      textures: {
        u_diffuseMap: this.diffuseMap,
      },
    };
  }
}
