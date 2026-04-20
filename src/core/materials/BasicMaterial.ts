/// src/core/materials/BasicMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Color } from "../../core/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

/**
 * Configuration options for BasicMaterial.
 */
export type BasicMaterialOptions = {
  color?: Color;
  diffuseMap?: Texture;
};

/**
 * A basic material that only uses a flat color.
 */
export class BasicMaterial extends AbstractMaterial {
  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  constructor(options?: BasicMaterialOptions) {
    super(MaterialType.BASIC);
    if (options) {
      if (options.color) {
        this.color.copyFrom(options.color);
      }
      this.diffuseMap = options.diffuseMap;
    }
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
        },
        textures: {
          u_diffuseMap: this.diffuseMap,
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();
    if (this.diffuseMap) {
      (props["u_texOffset"] as number[])[0] = this.diffuseMap.offset.x;
      (props["u_texOffset"] as number[])[1] = this.diffuseMap.offset.y;
      (props["u_texRepeat"] as number[])[0] = this.diffuseMap.repeat.x;
      (props["u_texRepeat"] as number[])[1] = this.diffuseMap.repeat.y;
      texs["u_diffuseMap"] = this.diffuseMap;
    } else {
      (props["u_texOffset"] as number[])[0] = 0;
      (props["u_texOffset"] as number[])[1] = 0;
      (props["u_texRepeat"] as number[])[0] = 1;
      (props["u_texRepeat"] as number[])[1] = 1;
      texs["u_diffuseMap"] = undefined;
    }

    this._renderManifest.state = {
      ...this._renderManifest.state,
      culling: this.cullMode,
    };

    return this._renderManifest;
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
  vec4 texColor = texture(u_diffuseMap, v_uv);
  fragColor = u_color * texColor;
}`,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: `[BASE_FS_HEADER]
void main() {
  vec4 texColor = texture2D(u_diffuseMap, v_uv);
  gl_FragColor = u_color * texColor;
}`,
        },
        wgsl: `[WGSL_STRUCTS]
[WGSL_VS]
@fragment fn fs(i: Out) -> @location(0) vec4f {
    let texCol = textureSample(u_diffuseMap, s, i.uv);
    return vec4f(texCol.rgb * obj.color.rgb, texCol.a * obj.color.a);
}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_texOffset: { type: ShaderPropertyType.VEC2 },
          u_texRepeat: { type: ShaderPropertyType.VEC2 },
        },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    };
  }
}
