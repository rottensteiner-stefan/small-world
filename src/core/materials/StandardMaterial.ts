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
import { InspectorField } from "../Inspectable.js";

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
  /** Ambient occlusion texture map. */
  aoMap?: Texture | undefined;
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
  /** Own fields on top of `AbstractMaterial.inspector` -- see `collectInspectorSchema()`. */
  public static override readonly inspector: Record<string, InspectorField> = {
    metallic: { type: "number", label: "Metallic", min: 0, max: 1, step: 0.01 },
    roughness: { type: "number", label: "Roughness", min: 0, max: 1, step: 0.01 },
    ao: { type: "number", label: "AO", min: 0, max: 1, step: 0.01 },
    emissiveColor: { type: "color", label: "Emissive" },
    emissiveIntensity: { type: "number", label: "Emissive Intensity", min: 0, max: 10, step: 0.1 },
    alphaTest: { type: "number", label: "Alpha Test", min: 0, max: 1, step: 0.01 },
  };

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

  /** Ambient occlusion texture map. */
  public aoMap: Texture | undefined;

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
      aoMap = undefined,
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
    this.aoMap = aoMap;
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

  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = this._createBaseManifest();
    }

    this._syncBaseManifestState();
    this._syncTexOffsetRepeat(
      this.diffuseMap ||
        this.emissiveMap ||
        this.normalMap ||
        this.metallicMap ||
        this.roughnessMap ||
        this.aoMap ||
        this.alphaMap,
    );

    const props = this._renderManifest.properties;
    const texs = this._renderManifest.textures;

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

    texs["u_diffuseMap"] = this.diffuseMap;
    texs["u_normalMap"] = this.normalMap;
    texs["u_metallicMap"] = this.metallicMap;
    texs["u_roughnessMap"] = this.roughnessMap;
    texs["u_aoMap"] = this.aoMap;
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
    if (this.metallicMap) flags.push("USE_METALLIC_MAP");
    if (this.roughnessMap) flags.push("USE_ROUGHNESS_MAP");
    if (this.aoMap) flags.push("USE_AO_MAP");
    if (this.emissiveMap) flags.push("USE_EMISSIVE_MAP");
    if (this.alphaMap) flags.push("USE_ALPHA_MAP");
    if (this.envMap) flags.push("USE_ENV_MAP");
    if (this.normalMap) flags.push("USE_NORMAL_MAP");
    if (this.reflectionMap) flags.push("USE_REFLECTION_MAP");
    this._renderManifest.flags = flags;

    if (this._renderManifest.state) {
      this._renderManifest.state.blending = this.transparent
        ? BlendingMode.ALPHA
        : BlendingMode.OPAQUE;
      this._renderManifest.state.depthWrite = !this.transparent;
    }

    return this._renderManifest;
  }

  /**
   * Creates an independent copy of this material. Useful before mutating per-instance
   * properties (e.g. an emissive hover glow) on a material that might be shared across
   * multiple objects, where a direct mutation would visibly affect all of them at once.
   */
  public clone(): StandardMaterial {
    const copy = new StandardMaterial({
      color: new Color(this.color.r, this.color.g, this.color.b, this.color.a),
      metallic: this.metallic,
      roughness: this.roughness,
      ao: this.ao,
      diffuseMap: this.diffuseMap,
      normalMap: this.normalMap,
      normalScale: this.normalScale.clone(),
      metallicMap: this.metallicMap,
      roughnessMap: this.roughnessMap,
      aoMap: this.aoMap,
      emissiveColor: new Color(
        this.emissiveColor.r,
        this.emissiveColor.g,
        this.emissiveColor.b,
        this.emissiveColor.a,
      ),
      emissiveMap: this.emissiveMap,
      alphaMap: this.alphaMap,
      envMap: this.envMap,
      reflectionMap: this.reflectionMap,
      reflectivity: this.reflectivity,
      emissiveIntensity: this.emissiveIntensity,
      transparent: this.transparent,
      alphaTest: this.alphaTest,
      time: this.time,
    });
    copy.cullMode = this.cullMode;
    copy.depthWrite = this.depthWrite;
    copy.depthTest = this.depthTest;
    return copy;
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
          u_aoMap: { type: ShaderPropertyType.TEXTURE },
          u_emissiveMap: { type: ShaderPropertyType.TEXTURE },
          u_alphaMap: { type: ShaderPropertyType.TEXTURE },
          u_envMap: { type: ShaderPropertyType.TEXTURE },
          u_reflectionMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
