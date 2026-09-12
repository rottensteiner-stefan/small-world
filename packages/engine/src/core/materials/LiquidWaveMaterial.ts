import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { ShaderPropertyType } from "../../enums/index.js";
import {
  RenderManifest,
  ShaderDefinition,
  StandardWebGPULayout,
} from "../renderers/shaders/index.js";

/**
 * Fully-resolved construction values shared by every wave-displaced, refractive liquid surface
 * (open/realistic water, stylized/toon water). Concrete subclasses expose their own
 * `*MaterialOptions` interface with material-specific field names/defaults and map them onto
 * this shape before calling `super()`.
 */
export interface LiquidWaveMaterialInit {
  color: Color;
  deepWaterColor: Color;
  edgeColor: Color;
  edgeSoftness: number;
  speed: number;
  wave1: [number, number, number, number];
  wave2: [number, number, number, number];
  wave3: [number, number, number, number];
  refractionStrength: number;
  waterAbsorption: [number, number, number];
  foamColor: Color;
  foamDistance: number;
  foamCutoff: number;
  foamNoiseScale: number;
  foamNoiseSpeed: number;
}

/**
 * Shared mechanism for wave-displaced, refractive liquid surfaces: Gerstner-wave vertex
 * displacement, screen-space refraction, Beer-Lambert depth absorption, and Worley-noise
 * shoreline/intersection foam. `OpenWaterMaterial` (realistic PBR look) and
 * `StylizedWaterMaterial` (toon look) are thin presets on top of this -- see
 * docs/adr/0013-unified-liquid-surface-material.md.
 *
 * The uniform layout this packs into (`StandardWebGPULayout`) has zero spare float slots left
 * after wave1/2/3 + foam params, which is why the opaque/emissive liquid family (lava, slime)
 * is built on `FluidSurfaceMaterial` instead -- that layout still has headroom.
 */
export abstract class LiquidWaveMaterial extends AbstractMaterial {
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
  public foamColor: Color;
  public foamDistance: number;
  public foamCutoff: number;
  public foamNoiseScale: number;
  public foamNoiseSpeed: number;

  protected constructor(type: string, init: LiquidWaveMaterialInit) {
    super(type);
    this.color = init.color;
    this.deepWaterColor = init.deepWaterColor;
    this.edgeColor = init.edgeColor;
    this.edgeSoftness = init.edgeSoftness;
    this.speed = init.speed;
    this.wave1 = init.wave1;
    this.wave2 = init.wave2;
    this.wave3 = init.wave3;
    this.refractionStrength = init.refractionStrength;
    this.waterAbsorption = init.waterAbsorption;
    this.foamColor = init.foamColor;
    this.foamDistance = init.foamDistance;
    this.foamCutoff = init.foamCutoff;
    this.foamNoiseScale = init.foamNoiseScale;
    this.foamNoiseSpeed = init.foamNoiseSpeed;

    this.transparent = true;
    this.depthWrite = false;
  }

  /** Vertex/fragment source per backend -- the only part that differs between presets. */
  protected abstract _getLiquidWaveShaderSources(): ShaderDefinition["sources"];

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
      // UV offset/repeat -- StandardWebGPULayout only has 3 free vec4 slots (already used by
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
      // u_isTerrain/u_metallic/u_roughness/u_useEnvMap/u_useReflectionMap/u_pad2 are the last
      // remaining free named slots -- repurposed for foamColor.rgb + foamCutoff/foamNoiseScale/
      // foamNoiseSpeed (no PBR/terrain/env-map features apply to this material).
      this._renderManifest.properties["u_isTerrain"] = this.foamColor.r;
      this._renderManifest.properties["u_metallic"] = this.foamColor.g;
      this._renderManifest.properties["u_roughness"] = this.foamColor.b;
      this._renderManifest.properties["u_useEnvMap"] = this.foamCutoff;
      this._renderManifest.properties["u_useReflectionMap"] = this.foamNoiseScale;
      this._renderManifest.properties["u_pad2"] = this.foamNoiseSpeed;
      // u_pad3 is the last remaining free named slot (see structs.wgsl/StandardWebGPULayout.ts)
      // -- repurposed to carry foamDistance, decoupled from edgeSoftness.
      this._renderManifest.properties["u_pad3"] = this.foamDistance;
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
    props["u_isTerrain"] = this.foamColor.r;
    props["u_metallic"] = this.foamColor.g;
    props["u_roughness"] = this.foamColor.b;
    props["u_useEnvMap"] = this.foamCutoff;
    props["u_useReflectionMap"] = this.foamNoiseScale;
    props["u_pad2"] = this.foamNoiseSpeed;
    props["u_pad3"] = this.foamDistance;

    return this._renderManifest;
  }

  public override getShaderDefinition(): ShaderDefinition {
    return {
      id: this.type,
      sources: this._getLiquidWaveShaderSources(),
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
