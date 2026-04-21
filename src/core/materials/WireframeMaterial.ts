import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, CullMode, ShaderPropertyType } from "../../enums/index.js";
import { Color } from "../colors/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

import fragGLSL from "./shaders/Wireframe.frag.glsl?raw";
import fragGLSL100 from "./shaders/Wireframe.frag.glsl100?raw";
import fragWGSL from "./shaders/Wireframe.frag.wgsl?raw";

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
          fs: fragGLSL,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: fragGLSL100,
        },
        wgsl: `[WGSL_STRUCTS]\n[WGSL_VS]\n${fragWGSL}`,
      },
      layout: {
        uniforms: { u_color: { type: ShaderPropertyType.COLOR } },
        textures: {},
      },
    };
  }
}
