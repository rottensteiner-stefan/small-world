import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, CullMode, ShaderPropertyType } from "../../enums/index.js";
import { Color } from "../colors/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

/**
 * A material for wireframe rendering.
 */
export class WireframeMaterial extends AbstractMaterial {
  constructor(color: Color = Color.WHITE) {
    super(MaterialType.WIREFRAME);
    this.color = color;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    return {
      shaderId: this.type,
      properties: {
        u_color: this.color.toFloat32Array(),
      },
      textures: {},
      state: {
        culling: CullMode.NONE, // Often useful for wireframes to see the back
      },
    };
  }

  /** @inheritdoc */
  public override getShaderDefinition(): ShaderDefinition {
    return {
      id: this.type,
      sources: {
        glsl300: {
          vs: "[BASE_VERTEX_HEADER][BASE_VERTEX_MAIN]",
          fs: `[BASE_FRAGMENT_HEADER]
void main() {
  fragColor = u_color;
}`,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: "void main() { gl_FragColor = u_color; }",
        },
        wgsl: `[WGSL_STRUCTS]
[WGSL_VS]
@fragment fn fs(i: Out) -> @location(0) vec4f {
    return obj.color;
}`,
      },
      layout: {
        uniforms: { u_color: { type: ShaderPropertyType.COLOR } },
        textures: {},
      },
    };
  }
}
