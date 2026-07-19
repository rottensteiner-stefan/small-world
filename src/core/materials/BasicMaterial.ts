/// src/core/materials/BasicMaterial.ts
import fragGLSL from "./shaders/Basic.frag.glsl?raw";
import fragGLSL100 from "./shaders/Basic.frag.glsl100?raw";
import fragWGSL from "./shaders/Basic.frag.wgsl?raw";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Color } from "../colors/index.js";
import { Texture } from "../textures/index.js";
import {
  RenderManifest,
  ShaderDefinition,
  StandardWebGPULayout,
} from "../renderers/shaders/index.js";

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

  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = this._createBaseManifest();
    }

    this._syncBaseManifestState();
    this._syncTexOffsetRepeat(this.diffuseMap);

    this._renderManifest.textures["u_diffuseMap"] = this.diffuseMap;

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
        wgsl: `[WGSL_STRUCTS]\n[WGSL_VS]\n${fragWGSL}`,
      },
      layout: {
        ...StandardWebGPULayout,
        textures: { u_diffuseMap: { type: ShaderPropertyType.TEXTURE } },
      },
    };
  }
}
