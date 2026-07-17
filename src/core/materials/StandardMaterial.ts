/// src/core/materials/StandardMaterial.ts
import fragGLSL from "./shaders/Standard.frag.glsl?raw";
import fragGLSL100 from "./shaders/Standard.frag.glsl100?raw";
import fragWGSL from "./shaders/Standard.frag.wgsl?raw";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType, BlendingMode } from "../../enums/index.js";
import { Texture, CubeTexture } from "../textures/index.js";
import {
  RenderManifest,
  ShaderDefinition,
  StandardWebGPULayout,
} from "../renderers/shaders/index.js";
import { Vector2D } from "../../math/index.js";

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
  /** Scale factor for the normal map to control strength and flip X/Y. Defaults to (1, 1). */
  normalScale?: Vector2D;
  /** The metallic texture map. */
  metallicMap?: Texture | undefined;
  /** The roughness texture map. */
  roughnessMap?: Texture | undefined;
  /** The emissive color. Defaults to black. */
  emissiveColor?: Color;
  /** The emissive texture map. */
  emissiveMap?: Texture | undefined;
  /** The alpha mask texture map. */
  alphaMap?: Texture | undefined;
  /** Environment map for Image-Based Lighting reflections. */
  envMap?: CubeTexture | undefined;
  /** Planar reflection map. */
  reflectionMap?: Texture | undefined;
  /** Planar reflection intensity. Defaults to 1.0. */
  reflectivity?: number;
  /** The intensity of the emissive light. Defaults to 1.0. */
  emissiveIntensity?: number;
  /** Whether the material is transparent. Defaults to false. */
  transparent?: boolean;
  /** Alpha cutoff threshold. Fragments with alpha below this value are discarded. Defaults to 0.0. */
  alphaTest?: number;
  /** Time parameter for shader animations. Defaults to 0.0. */
  time?: number;
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

  /** Scale factor for the normal map to control strength and flip X/Y. */
  public normalScale: Vector2D;

  /** The metallic map texture. */
  public metallicMap: Texture | undefined;

  /** The roughness map texture. */
  public roughnessMap: Texture | undefined;

  /** The emissive color. */
  public emissiveColor: Color;

  /** The emissive map texture. */
  public emissiveMap: Texture | undefined;

  /** The alpha mask texture map. */
  public alphaMap: Texture | undefined;

  /** The environment map for reflections. */
  public envMap: CubeTexture | undefined;

  /** The planar reflection map. */
  public reflectionMap: Texture | undefined;

  /** The intensity of the planar reflection. */
  public reflectivity: number;

  /** The intensity of the emissive glow. */
  public emissiveIntensity: number;

  /** Alpha cutoff threshold. */
  public alphaTest: number;

  /** Time parameter for shader animations. */
  public time: number;

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
      normalScale = new Vector2D(1, 1),
      metallicMap = undefined,
      roughnessMap = undefined,
      emissiveColor = new Color(0, 0, 0),
      emissiveMap = undefined,
      alphaMap = undefined,
      envMap = undefined,
      reflectionMap = undefined,
      reflectivity = 1.0,
      emissiveIntensity = 1.0,
      transparent = false,
      alphaTest = 0.0,
      time = 0.0,
    } = options;
    this.color = color;
    this.metallic = metallic;
    this.roughness = roughness;
    this.ao = ao;
    this.diffuseMap = diffuseMap;
    this.normalMap = normalMap;
    this.normalScale = normalScale;
    this.metallicMap = metallicMap;
    this.roughnessMap = roughnessMap;
    this.emissiveColor = emissiveColor;
    this.emissiveMap = emissiveMap;
    this.alphaMap = alphaMap;
    this.envMap = envMap;
    this.reflectionMap = reflectionMap;
    this.reflectivity = reflectivity;
    this.emissiveIntensity = emissiveIntensity;
    this.transparent = transparent;
    this.alphaTest = alphaTest;
    this.time = time;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_specColor: new Float32Array([
            this.emissiveColor.r,
            this.emissiveColor.g,
            this.emissiveColor.b,
            this.emissiveIntensity,
          ]),
          u_metallic: this.metallic,
          u_roughness: this.roughness,
          u_extraParams: [this.ao, this.alphaTest, this.normalScale.x, this.normalScale.y], // ao, alphaTest, normalScaleX, normalScaleY
          u_liquidParams: [0, 0, 0, 0],
          u_thresholds: [0, 0, 0, 0],
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
          u_shininess: 32.0,
          u_isTerrain: 0.0,
          u_useEnvMap: this.envMap ? 1.0 : 0.0,
          u_useReflectionMap: this.reflectionMap ? 1.0 : 0.0,
          u_reflectivity: this.reflectivity,
          u_time: this.time,
        },
        textures: {
          u_diffuseMap: this.diffuseMap,
          u_normalMap: this.normalMap,
          u_metallicMap: this.metallicMap,
          u_roughnessMap: this.roughnessMap,
          u_emissiveMap: this.emissiveMap,
          u_alphaMap: this.alphaMap,
          u_skybox: this.envMap,
          u_reflectionMap: this.reflectionMap,
        },
      };
    }

    const props = this._renderManifest.properties;
    const texs = this._renderManifest.textures;

    props["u_color"] = this.color.toFloat32Array();
    (props["u_specColor"] as Float32Array)[0] = this.emissiveColor.r;
    (props["u_specColor"] as Float32Array)[1] = this.emissiveColor.g;
    (props["u_specColor"] as Float32Array)[2] = this.emissiveColor.b;
    (props["u_specColor"] as Float32Array)[3] = this.emissiveIntensity;
    props["u_metallic"] = this.metallic;
    props["u_roughness"] = this.roughness;
    (props["u_extraParams"] as number[])[0] = this.ao;
    (props["u_extraParams"] as number[])[1] = this.alphaTest;
    (props["u_extraParams"] as number[])[2] = this.normalScale.x;
    (props["u_extraParams"] as number[])[3] = this.normalScale.y;

    const tex =
      this.diffuseMap ||
      this.emissiveMap ||
      this.normalMap ||
      this.metallicMap ||
      this.roughnessMap ||
      this.alphaMap;
    if (tex) {
      (props["u_texOffset"] as number[])[0] = tex.offset.x;
      (props["u_texOffset"] as number[])[1] = tex.offset.y;
      (props["u_texRepeat"] as number[])[0] = tex.repeat.x;
      (props["u_texRepeat"] as number[])[1] = tex.repeat.y;
    } else {
      (props["u_texOffset"] as number[])[0] = 0;
      (props["u_texOffset"] as number[])[1] = 0;
      (props["u_texRepeat"] as number[])[0] = 1;
      (props["u_texRepeat"] as number[])[1] = 1;
    }

    texs["u_diffuseMap"] = this.diffuseMap;
    texs["u_normalMap"] = this.normalMap;
    texs["u_metallicMap"] = this.metallicMap;
    texs["u_roughnessMap"] = this.roughnessMap;
    texs["u_emissiveMap"] = this.emissiveMap;
    texs["u_alphaMap"] = this.alphaMap;
    texs["u_skybox"] = this.envMap;
    texs["u_reflectionMap"] = this.reflectionMap;
    props["u_useEnvMap"] = this.envMap ? 1.0 : 0.0;
    props["u_useReflectionMap"] = this.reflectionMap ? 1.0 : 0.0;
    props["u_reflectivity"] = this.reflectivity;
    props["u_time"] = this.time;

    const flags: string[] = [];
    if (
      this.diffuseMap &&
      "isTextureArray" in this.diffuseMap &&
      (this.diffuseMap as import("../textures/index.js").TextureArray).isTextureArray
    ) {
      flags.push("USE_TEXTURE_ARRAY");
    }
    this._renderManifest.flags = flags;

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
          u_metallicMap: { type: ShaderPropertyType.TEXTURE },
          u_roughnessMap: { type: ShaderPropertyType.TEXTURE },
          u_emissiveMap: { type: ShaderPropertyType.TEXTURE },
          u_alphaMap: { type: ShaderPropertyType.TEXTURE },
          u_envMap: { type: ShaderPropertyType.TEXTURE },
          u_reflectionMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
