/// src/core/materials/WorldMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Color } from "../../core/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

import fragGLSL from "./shaders/World.frag.glsl?raw";
import fragGLSL100 from "./shaders/World.frag.glsl100?raw";
import fragWGSL from "./shaders/World.frag.wgsl?raw";

export type WorldMaterialOptions = {
  color?: Color;
  diffuseMap?: Texture;
};

/**
 * A material that uses triplanar mapping to render seamless textures across world space coordinates.
 * Ideal for terrain, rocks, walls, and architectural structures.
 */
export class WorldMaterial extends AbstractMaterial {
  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  constructor(options?: WorldMaterialOptions) {
    super(MaterialType.WORLD);
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
      (props["u_texRepeat"] as number[])[0] = this.diffuseMap.repeat.x;
      (props["u_texRepeat"] as number[])[1] = this.diffuseMap.repeat.y;
    } else {
      (props["u_texRepeat"] as number[])[0] = 1;
      (props["u_texRepeat"] as number[])[1] = 1;
    }

    texs["u_diffuseMap"] = this.diffuseMap;

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
          fs: fragGLSL,
        },
        glsl100: {
          vs: "[BASE_VS]",
          fs: fragGLSL100,
        },
        wgsl: fragWGSL,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_texRepeat: { type: ShaderPropertyType.VEC2 },
        },
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    };
  }
}
