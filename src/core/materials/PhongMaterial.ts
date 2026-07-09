/// src/core/materials/PhongMaterial.ts
import fragGLSL from "./shaders/Phong.frag.glsl?raw";
import fragGLSL100 from "./shaders/Phong.frag.glsl100?raw";
import fragWGSL from "./shaders/Phong.frag.wgsl?raw";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType, BlendingMode } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import {
  RenderManifest,
  ShaderDefinition,
  StandardWebGPULayout,
} from "../renderers/shaders/index.js";
import { Vector2D } from "../../math/index.js";

/**
 * Configuration options for Phong material.
 */
export interface PhongMaterialOptions {
  /** The base color of the material. Defaults to white. */
  color?: Color;
  /** The specular reflection color. Defaults to white. */
  specularColor?: Color;
  /** The shininess factor. Defaults to 32.0. */
  shininess?: number;
  /** The diffuse texture map. Defaults to undefined. */
  diffuseMap?: Texture | undefined;
  /** The normal map texture. Defaults to undefined. */
  normalMap?: Texture | undefined;
  /** Scale factor for the normal map to control strength and flip X/Y. Defaults to (1, 1). */
  normalScale?: Vector2D;
  /** The specular map texture. Defaults to undefined. */
  specularMap?: Texture | undefined;
  /** Whether the material is transparent. Defaults to false. */
  transparent?: boolean;
  /** Alpha cutoff threshold. Fragments with alpha below this value are discarded. Defaults to 0.0. */
  alphaTest?: number;
}

/**
 * Material that implements the Phong reflection model.
 */
export class PhongMaterial extends AbstractMaterial {
  /** The specular reflection color. */
  public specularColor: Color;

  /** The shininess factor. */
  public shininess: number;

  /** The diffuse texture map. */
  public diffuseMap: Texture | undefined;

  /** The normal map texture. */
  public normalMap: Texture | undefined;

  /** Scale factor for the normal map to control strength and flip X/Y. */
  public normalScale: Vector2D;

  /** The specular map texture. */
  public specularMap: Texture | undefined;

  /** Alpha cutoff threshold. */
  public alphaTest: number;

  /**
   * Creates a new PhongMaterial.
   * @param options The configuration options for the material.
   */
  constructor(options: PhongMaterialOptions = {}) {
    super(MaterialType.PHONG);
    const {
      color = Color.WHITE,
      specularColor = Color.WHITE,
      shininess = 32.0,
      diffuseMap = undefined,
      normalMap = undefined,
      normalScale = new Vector2D(1, 1),
      specularMap = undefined,
      transparent = false,
      alphaTest = 0.0,
    } = options;
    this.color = color;
    this.specularColor = specularColor;
    this.shininess = shininess;
    this.diffuseMap = diffuseMap;
    this.normalMap = normalMap;
    this.normalScale = normalScale;
    this.specularMap = specularMap;
    this.transparent = transparent;
    this.alphaTest = alphaTest;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_specColor: this.specularColor.toFloat32Array(),
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
          u_shininess: this.shininess,
          u_isTerrain: 0.0,
          u_metallic: 0.0,
          u_roughness: 0.5,
          u_extraParams: [1.0, this.alphaTest, this.normalScale.x, this.normalScale.y],
          u_liquidParams: [0, 0, 0, 0],
          u_thresholds: [0, 0, 0, 0],
        },
        textures: {
          u_diffuseMap: this.diffuseMap,
          u_normalMap: this.normalMap,
          u_specularMap: this.specularMap,
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();
    props["u_specColor"] = this.specularColor.toFloat32Array();
    props["u_shininess"] = this.shininess;
    (props["u_extraParams"] as number[])[1] = this.alphaTest;
    (props["u_extraParams"] as number[])[2] = this.normalScale.x;
    (props["u_extraParams"] as number[])[3] = this.normalScale.y;

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
    texs["u_specularMap"] = this.specularMap;

    this._renderManifest.state = {
      ...this._renderManifest.state,
      culling: this.cullMode,
      transparent: this.transparent,
      blending: this.transparent ? BlendingMode.ALPHA : BlendingMode.OPAQUE,
      depthWrite: !this.transparent,
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
        wgsl: `[WGSL_STRUCTS]\n[WGSL_PBR_MATH]\n[WGSL_VS]\n${fragWGSL}`,
      },
      layout: {
        ...StandardWebGPULayout,
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
          u_specularMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
