import vertWGSL from "./shaders/OpenWater.vert.wgsl?raw";
import fragWGSL from "./shaders/OpenWater.frag.wgsl?raw";
import vertGLSL from "./shaders/OpenWater.vert.glsl?raw";
import fragGLSL from "./shaders/OpenWater.frag.glsl?raw";
import vertGLSL100 from "./shaders/OpenWater.vert.glsl100?raw";
import fragGLSL100 from "./shaders/OpenWater.frag.glsl100?raw";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import {
  RenderManifest,
  ShaderDefinition,
  StandardWebGPULayout,
} from "../renderers/shaders/index.js";

export interface OpenWaterMaterialOptions {
  waterColor?: Color;
  deepWaterColor?: Color;
  edgeColor?: Color;
  edgeSoftness?: number;
  speed?: number;
  wave1?: [number, number, number, number];
  wave2?: [number, number, number, number];
  wave3?: [number, number, number, number];
  /** How strongly the wave normal distorts the sampled opaque (below-water) scene color, i.e.
   * screen-space refraction strength. 0 disables distortion (straight screen-space sample). */
  refractionStrength?: number;
  /** Per-channel Beer-Lambert absorption coefficient -- how quickly each color channel fades out
   * with water depth (thicker water = more of `deepWaterColor`, less of the tinted seabed).
   * Higher values fade faster. Red typically fades fastest in real water. */
  waterAbsorption?: [number, number, number];
}

export class OpenWaterMaterial extends AbstractMaterial {
  public override color: Color;
  public deepWaterColor: Color;
  public edgeColor: Color;
  public edgeSoftness: number;
  public speed: number;
  public wave1: [number, number, number, number];
  public wave2: [number, number, number, number];
  public wave3: [number, number, number, number];
  public time: number = 0.0;
  public refractionStrength: number;
  public waterAbsorption: [number, number, number];

  constructor(options: OpenWaterMaterialOptions = {}) {
    super(MaterialType.OPEN_WATER);
    const {
      waterColor = new Color(0.0, 0.5, 0.8),
      deepWaterColor = new Color(0.0, 0.1, 0.3),
      edgeColor = new Color(0.8, 0.9, 1.0),
      edgeSoftness = 1.0,
      speed = 1.0,
      wave1 = [1.0, 0.5, 0.1, 10.0],
      wave2 = [0.2, 0.8, 0.15, 6.0],
      wave3 = [-0.3, 0.7, 0.05, 3.0],
      refractionStrength = 0.03,
      waterAbsorption = [0.3, 0.06, 0.02],
    } = options;

    this.color = waterColor;
    this.deepWaterColor = deepWaterColor;
    this.edgeColor = edgeColor;
    this.edgeSoftness = edgeSoftness;
    this.speed = speed;
    this.wave1 = wave1;
    this.wave2 = wave2;
    this.wave3 = wave3;
    this.refractionStrength = refractionStrength;
    this.waterAbsorption = waterAbsorption;

    this.transparent = true;
    this.depthWrite = false;
  }

  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = this._createBaseManifest();
      // Left undefined so WebGL2 falls back to the live-captured opaque depth texture
      // (see WebGL2Renderer's sampler-bind loop); WebGPU does the equivalent fallback itself.
      this._renderManifest.textures["u_opaqueDepthMap"] = undefined;
      // Same fallback pattern for the opaque *color* capture (see GlassMaterial/FrostglassMaterial,
      // which pioneered this texture for screen-space refraction) -- gives the water surface a real
      // view of what's below it instead of only fading to a flat deepWaterColor.
      this._renderManifest.textures["u_opaqueMap"] = undefined;
      this._renderManifest.properties["u_specColor"] = this.deepWaterColor.toFloat32Array();
      // u_texOffset/u_texRepeat carry edgeColor.rgb + edgeSoftness here, not actual texture
      // UV offset/repeat — StandardWebGPULayout only has 3 free vec4 slots (already used by
      // wave1/2/3 below), so these unrelated vec2 slots are repurposed to fit edge shading data.
      this._renderManifest.properties["u_texOffset"] = [this.edgeColor.r, this.edgeColor.g];
      this._renderManifest.properties["u_texRepeat"] = [this.edgeColor.b, this.edgeSoftness];
      this._renderManifest.properties["u_extraParams"] = [...this.wave1];
      this._renderManifest.properties["u_liquidParams"] = [...this.wave2];
      this._renderManifest.properties["u_thresholds"] = [...this.wave3];
      this._renderManifest.properties["u_reflectivity"] = this.speed;
      this._renderManifest.properties["u_time"] = this.time;
      // u_shininess is otherwise unused by this material (no specular map) -- repurposed to carry
      // refractionStrength, same "borrow a free named slot" convention as u_texOffset/u_texRepeat
      // above.
      this._renderManifest.properties["u_shininess"] = this.refractionStrength;
      // u_isSkinned/u_boneOffset/u_pad1 are skeletal-animation-only fields, meaningless for a
      // water plane -- repurposed to carry the 3 waterAbsorption channels (no free vec3/vec4
      // uniform slot remains; wave1/2/3 already occupy all three).
      this._renderManifest.properties["u_isSkinned"] = this.waterAbsorption[0];
      this._renderManifest.properties["u_boneOffset"] = this.waterAbsorption[1];
      this._renderManifest.properties["u_pad1"] = this.waterAbsorption[2];
    }

    this._syncBaseManifestState();

    const props = this._renderManifest.properties as Record<string, unknown>;
    props["u_specColor"] = this.deepWaterColor.toFloat32Array();

    const offset = props["u_texOffset"] as number[];
    offset[0] = this.edgeColor.r;
    offset[1] = this.edgeColor.g;

    const repeat = props["u_texRepeat"] as number[];
    repeat[0] = this.edgeColor.b;
    repeat[1] = this.edgeSoftness;

    const e = props["u_extraParams"] as number[];
    e[0] = this.wave1[0];
    e[1] = this.wave1[1];
    e[2] = this.wave1[2];
    e[3] = this.wave1[3];

    const l = props["u_liquidParams"] as number[];
    l[0] = this.wave2[0];
    l[1] = this.wave2[1];
    l[2] = this.wave2[2];
    l[3] = this.wave2[3];

    const t = props["u_thresholds"] as number[];
    t[0] = this.wave3[0];
    t[1] = this.wave3[1];
    t[2] = this.wave3[2];
    t[3] = this.wave3[3];

    props["u_reflectivity"] = this.speed;
    props["u_time"] = this.time;
    props["u_shininess"] = this.refractionStrength;
    props["u_isSkinned"] = this.waterAbsorption[0];
    props["u_boneOffset"] = this.waterAbsorption[1];
    props["u_pad1"] = this.waterAbsorption[2];

    return this._renderManifest;
  }

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
        wgsl: `${vertWGSL}\n[WGSL_PBR_MATH]\n${fragWGSL}`,
      },
      layout: {
        ...StandardWebGPULayout,
        textures: {
          u_opaqueDepthMap: { type: ShaderPropertyType.TEXTURE },
          u_opaqueMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
