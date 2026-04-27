/// src/core/materials/LiquidMaterial.ts

import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";
import { StandardWebGPULayout } from "../renderers/shaders/StandardWebGPULayout.js";

import vertGLSL from "./shaders/Liquid.vert.glsl?raw";
import fragGLSL from "./shaders/Liquid.frag.glsl?raw";
import vertGLSL100 from "./shaders/Liquid.vert.glsl100?raw";
import fragGLSL100 from "./shaders/Liquid.frag.glsl100?raw";
import fragWGSL from "./shaders/Liquid.frag.wgsl?raw";

/**
 * Configuration options for LiquidMaterial.
 */
export interface LiquidMaterialOptions {
  /** The base glow color of the liquid. */
  color?: Color | undefined;
  /** The color of the crust or darker parts. */
  crustColor?: Color | undefined;
  /** The speed of the liquid flow animation. */
  flowSpeed?: number | undefined;
  /** The scale of the noise. */
  noiseScale?: number | undefined;
  /** A noise texture map used to generate the crust and flow. */
  noiseMap?: Texture | undefined;
  /** Displacement map for vertex waves. */
  displacementMap?: Texture | undefined;
  /** Normal map for surface detail. */
  normalMap?: Texture | undefined;
  /** Specular map for shininess. */
  specularMap?: Texture | undefined;
  /** Ambient map for occlusion or base glow. */
  ambientMap?: Texture | undefined;
  /** Frequency of the vertex waves. */
  waveFrequency?: number | undefined;
  /** Amplitude of the vertex waves. */
  waveAmplitude?: number | undefined;
}

/**
 * A highly specialized material for rendering animated liquids like lava or slime.
 */
export abstract class LiquidMaterial extends AbstractMaterial {
  /** The color of the cooled crust or dark parts. */
  public crustColor: Color;
  /** The speed of the flow animation. */
  public flowSpeed: number;
  /** The scale of the noise pattern. */
  public noiseScale: number;
  /** The current time/frame for animation. */
  public time: number = 0.0;
  /** The noise texture. */
  public noiseMap: Texture | undefined;
  /** Optional displacement map. */
  public displacementMap: Texture | undefined;
  /** Optional normal map. */
  public normalMap: Texture | undefined;
  /** Optional specular map. */
  public specularMap: Texture | undefined;
  /** Optional ambient map. */
  public ambientMap: Texture | undefined;
  /** Wave frequency. */
  public waveFrequency: number;
  /** Wave amplitude. */
  public waveAmplitude: number;

  /**
   * Creates a new LiquidMaterial.
   * @param options The configuration options.
   * @param type The material type.
   */
  constructor(options: LiquidMaterialOptions = {}, type: MaterialType) {
    super(type);
    const {
      color = new Color(1.0, 1.0, 1.0),
      crustColor = new Color(0.1, 0.1, 0.1),
      flowSpeed = 1.0,
      noiseScale = 2.0,
      noiseMap = undefined,
      displacementMap = undefined,
      normalMap = undefined,
      specularMap = undefined,
      ambientMap = undefined,
      waveFrequency = 5.0,
      waveAmplitude = 0.15,
    } = options;

    this.color = color;
    this.crustColor = crustColor;
    this.flowSpeed = flowSpeed;
    this.noiseScale = noiseScale;
    this.noiseMap = noiseMap;
    this.displacementMap = displacementMap;
    this.normalMap = normalMap;
    this.specularMap = specularMap;
    this.ambientMap = ambientMap;
    this.waveFrequency = waveFrequency;
    this.waveAmplitude = waveAmplitude;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = {
        shaderId: this.type,
        properties: {
          u_color: this.color.toFloat32Array(),
          u_specColor: this.crustColor.toFloat32Array(),
          u_texOffset: [0, 0],
          u_texRepeat: [1, 1],
          u_shininess: 32.0,
          u_isTerrain: 0.0,
          u_metallic: 0.0,
          u_roughness: 0.5,
          u_extraParams: [1.0, this.time, this.flowSpeed, this.noiseScale],
          u_liquidParams: [this.waveFrequency, this.waveAmplitude, 0, 0],
          u_thresholds: [0, 0, 0, 0],
        },
        textures: {
          u_diffuseMap: this.noiseMap,
        },
      };
    }

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_color"] = this.color.toFloat32Array();
    props["u_specColor"] = this.crustColor.toFloat32Array();
    
    const extra = props["u_extraParams"] as number[];
    extra[1] = this.time;
    extra[2] = this.flowSpeed;
    extra[3] = this.noiseScale;

    const liquid = props["u_liquidParams"] as number[];
    liquid[0] = this.waveFrequency;
    liquid[1] = this.waveAmplitude;

    texs["u_diffuseMap"] = this.noiseMap;
    if (this.displacementMap) texs["u_displacementMap"] = this.displacementMap;
    if (this.normalMap) texs["u_normalMap"] = this.normalMap;
    if (this.specularMap) texs["u_specularMap"] = this.specularMap;
    if (this.ambientMap) texs["u_ambientMap"] = this.ambientMap;

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
          vs: vertGLSL,
          fs: fragGLSL,
        },
        glsl100: {
          vs: vertGLSL100,
          fs: fragGLSL100,
        },
        wgsl: `[WGSL_STRUCTS]\n[WGSL_PBR_MATH]\n${fragWGSL}`,
      },
      layout: {
        ...StandardWebGPULayout,
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_displacementMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
          u_specularMap: { type: ShaderPropertyType.TEXTURE },
          u_ambientMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
