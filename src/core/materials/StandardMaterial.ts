import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

import fragGLSL from "./shaders/Standard.frag.glsl?raw";
import fragGLSL100 from "./shaders/Standard.frag.glsl100?raw";
import fragWGSL from "./shaders/Standard.frag.wgsl?raw";

/**
 * Configuration options for StandardMaterial.
 */
export interface StandardMaterialOptions {
  /** The base color of the material. Defaults to white. */
  color?: Color;
  /** Metallic factor (0 to 1). Defaults to 0. */
  metallic?: number;
  /** Roughness factor (0 to 1). Defaults to 0.5. */
  roughness?: number;
  /** Ambient occlusion factor (0 to 1). Defaults to 1. */
  ao?: number;
  /** The diffuse texture map. */
  diffuseMap?: Texture | undefined;
  /** The normal map texture. */
  normalMap?: Texture | undefined;
}

/**
 * A physically based rendering (PBR) material using the Metallic-Roughness workflow.
 */
export class StandardMaterial extends AbstractMaterial {
  /** Metallic factor (0 to 1). */
  public metallic: number;
  /** Roughness factor (0 to 1). */
  public roughness: number;
  /** Ambient occlusion factor (0 to 1). */
  public ao: number;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  /** The normal map texture. */
  public normalMap: Texture | undefined;

  /**
   * Creates a new StandardMaterial.
   * @param options The configuration options for the material.
   */
  constructor(options: StandardMaterialOptions = {}) {
    super(MaterialType.STANDARD);
    const {
      color = Color.WHITE,
      metallic = 0.0,
      roughness = 0.5,
      ao = 1.0,
      diffuseMap = undefined,
      normalMap = undefined,
    } = options;
    this.color = color;
    this.metallic = metallic;
    this.roughness = roughness;
    this.ao = ao;
    this.diffuseMap = diffuseMap;
    this.normalMap = normalMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_metallic: this.metallic,
          u_roughness: this.roughness,
          u_ao: this.ao,
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
        },
        textures: {
          u_diffuseMap: this.diffuseMap,
          u_normalMap: this.normalMap,
        },
      };
    }

    const props = this._renderManifest.properties;
    const texs = this._renderManifest.textures;

    props["u_color"] = this.color.toFloat32Array();
    props["u_metallic"] = this.metallic;
    props["u_roughness"] = this.roughness;
    props["u_ao"] = this.ao;

    if (this.diffuseMap) {
      (props["u_texOffset"] as number[])[0] = this.diffuseMap.offset.x;
      (props["u_texOffset"] as number[])[1] = this.diffuseMap.offset.y;
      (props["u_texRepeat"] as number[])[0] = this.diffuseMap.repeat.x;
      (props["u_texRepeat"] as number[])[1] = this.diffuseMap.repeat.y;
    } else {
      (props["u_texOffset"] as number[])[0] = 0;
      (props["u_texOffset"] as number[])[1] = 0;
      (props["u_texRepeat"] as number[])[0] = 1;
      (props["u_texRepeat"] as number[])[1] = 1;
    }

    texs["u_diffuseMap"] = this.diffuseMap;
    texs["u_normalMap"] = this.normalMap;

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
          u_metallic: { type: ShaderPropertyType.FLOAT },
          u_roughness: { type: ShaderPropertyType.FLOAT },
          u_ao: { type: ShaderPropertyType.FLOAT },
          u_viewPos: { type: ShaderPropertyType.VEC3 },
          u_ambientColor: { type: ShaderPropertyType.VEC3 },
          u_dirLightColor: { type: ShaderPropertyType.VEC3 },
          u_dirLightDir: { type: ShaderPropertyType.VEC3 },
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
