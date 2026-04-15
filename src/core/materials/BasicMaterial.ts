/// src/core/materials/BasicMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/index.js";
import { Color } from "../../core/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

export type BasicMaterialOptions = {
  color?: Color;
  diffuseMap?: Texture;
};

/**
 * A basic material that only uses a flat color.
 */
export class BasicMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.BASIC;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  constructor(options?: BasicMaterialOptions) {
    super();
    if (options) {
      if (options.color) {
        this.color.copyFrom(options.color);
      }
      this.diffuseMap = options.diffuseMap;
    }
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    return {
      shaderId: this.type,
      properties: {
        u_color: this.color.toFloat32Array(),
        u_texOffset: this.diffuseMap
          ? [this.diffuseMap.offset.x, this.diffuseMap.offset.y]
          : [0, 0],
        u_texRepeat: this.diffuseMap
          ? [this.diffuseMap.repeat.x, this.diffuseMap.repeat.y]
          : [1, 1],
      },
      textures: {
        u_diffuseMap: this.diffuseMap,
      },
    };
  }
}
