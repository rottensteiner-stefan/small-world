/// src/core/materials/WorldMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType } from "../../enums/index.js";
import { Color } from "../../core/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

export type WorldMaterialOptions = {
  color?: Color;
  diffuseMap?: Texture;
};

/**
 * A material that uses triplanar mapping to render seamless textures across world space coordinates.
 * Ideal for terrain, rocks, walls, and architectural structures.
 */
export class WorldMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.WORLD;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  constructor(options?: WorldMaterialOptions) {
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
        u_color: this.color,
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
