/// src/core/materials/WireframeMaterial.ts
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, CullMode } from "../../enums/index.js";
import { Color } from "../colors/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";

/**
 * A material for wireframe rendering.
 */
export class WireframeMaterial extends AbstractMaterial {
  /** @inheritdoc */
  public override readonly type: MaterialType = MaterialType.WIREFRAME;

  constructor(color: Color = Color.WHITE) {
    super();
    this.color = color;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    return {
      shaderId: this.type,
      properties: {
        u_color: this.color,
      },
      textures: {},
      state: {
        culling: CullMode.NONE, // Often useful for wireframes to see the back
      },
    };
  }
}
