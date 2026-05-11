import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, CullMode } from "../../enums/index.js";
import { Color } from "../colors/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";
import { StandardWebGPULayout } from "../renderers/shaders/StandardWebGPULayout.js";

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
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_specColor: new Float32Array([1, 1, 1, 1]),
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
          u_shininess: 32.0,
          u_isTerrain: 0.0,
          u_metallic: 0.0,
          u_roughness: 0.5,
          u_extraParams: [1.0, 0, 0, 0],
          u_liquidParams: [0, 0, 0, 0],
          u_thresholds: [0, 0, 0, 0],
        },
        textures: {},
        state: {
          culling: CullMode.NONE, // Often useful for wireframes to see the back
          topology: "line-list",
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    props["u_color"] = this.color.toFloat32Array();

    return this._renderManifest!;
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
        ...StandardWebGPULayout,
        textures: {},
      },
    };
  }
}
