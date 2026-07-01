/// src/core/materials/GlassMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType, BlendingMode } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";
import { StandardWebGPULayout } from "../renderers/shaders/StandardWebGPULayout.js";

import fragGLSL from "./shaders/Glass.frag.glsl?raw";
import fragGLSL100 from "./shaders/Glass.frag.glsl100?raw";
import fragWGSL from "./shaders/Glass.frag.wgsl?raw";

export interface GlassMaterialOptions {
  color?: Color;
  metallic?: number;
  roughness?: number;
  ior?: number;
  thickness?: number;
  transmission?: number;
  normalMap?: Texture | undefined;
}

export class GlassMaterial extends AbstractMaterial {
  public override color: Color;
  public metallic: number;
  public roughness: number;
  public ior: number;
  public thickness: number;
  public transmission: number;
  public normalMap?: Texture;

  constructor(options: GlassMaterialOptions = {}) {
    super(MaterialType.GLASS);
    this.color = options.color || new Color(1, 1, 1, 1);
    this.metallic = options.metallic ?? 0.0;
    this.roughness = options.roughness ?? 0.1;
    this.ior = options.ior ?? 1.5;
    this.thickness = options.thickness ?? 1.0;
    this.transmission = options.transmission ?? 1.0;
    if (options.normalMap) {
      this.normalMap = options.normalMap;
    }
  }

  public getRenderManifest(): RenderManifest {
    if (!this._renderManifest) {
      this._renderManifest = {
        shaderId: MaterialType.GLASS,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_specColor: new Float32Array([0, 0, 0, 0]),
          u_metallic: this.metallic,
          u_roughness: this.roughness,
          u_extraParams: [0.0, 0.0, 1.0, 1.0], // ao, alphaTest, normalScaleX, normalScaleY
          u_liquidParams: [this.ior, this.thickness, this.transmission, 0], // Reusing for Glass params
          u_thresholds: [0, 0, 0, 0],
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
          u_shininess: 32.0,
          u_isTerrain: 0.0,
        },
        textures: {
          u_diffuseMap: undefined,
          u_normalMap: this.normalMap || undefined,
          u_opaqueMap: undefined, // The opaque map texture!
        },
        state: {
          transparent: true,
          blending: BlendingMode.ALPHA,
          depthWrite: false,
        },
      };
    }

    const props = this._renderManifest.properties;
    props["u_color"] = this.color.toFloat32Array();
    props["u_metallic"] = this.metallic;
    props["u_roughness"] = this.roughness;
    (props["u_liquidParams"] as number[])[0] = this.ior;
    (props["u_liquidParams"] as number[])[1] = this.thickness;
    (props["u_liquidParams"] as number[])[2] = this.transmission;

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
        wgsl: `[WGSL_STRUCTS]\n[WGSL_PBR_MATH]\n[WGSL_VS]\n${fragWGSL}`,
      },
      layout: {
        ...StandardWebGPULayout,
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
          u_opaqueMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
