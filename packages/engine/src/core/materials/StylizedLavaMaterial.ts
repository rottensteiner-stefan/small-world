import vertWGSL from "./shaders/StylizedLava.vert.wgsl?raw";
import fragWGSL from "./shaders/StylizedLava.frag.wgsl?raw";
import vertGLSL from "./shaders/StylizedLava.vert.glsl?raw";
import fragGLSL from "./shaders/StylizedLava.frag.glsl?raw";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import {
  RenderManifest,
  ShaderDefinition,
  StandardWebGPULayout,
} from "../renderers/shaders/index.js";
import { Texture } from "../textures/index.js";

/**
 * Options for configuring {@link StylizedLavaMaterial}.
 * Defaults match MinionsArt's iconic Astro Kat settings (https://i.imgur.com/f7xrwGX.png).
 */
export interface StylizedLavaMaterialOptions {
  /** Dark basalt/crust color (default: #241a1c). */
  crustColor?: Color;
  /** Molten magma core color (default: #983400). */
  magmaColor?: Color;
  /** Superheated fissure crack color (default: #ff672d). */
  fissureColor?: Color;
  /** Shoreline contact scorch color (default: #ff4b00). */
  shoreColor?: Color;

  /** UV scale of main basalt crust pattern (default: 0.328). */
  scaleMain?: number;
  /** UV scale of flow distortion noise (default: 0.325). */
  scaleDistort?: number;
  /** UV offset distortion strength (default: 0.292). */
  distortionStrength?: number;

  /** Primary flow velocity X (default: 1.43). */
  speedMainX?: number;
  /** Primary flow velocity Y (default: 1.04). */
  speedMainY?: number;
  /** Distortion field velocity X (default: 0.91). */
  speedDistortX?: number;
  /** Distortion field velocity Y (default: 1.17). */
  speedDistortY?: number;

  /** Cutoff threshold for hot glowing cracks (0..1, default: 0.815). */
  cutoffTop?: number;
  /** Blur width for crack edge transition (default: 0.1). */
  topBlur?: number;
  /** Tint ramp contrast offset (default: 1.43). */
  tintOffset?: number;

  /** Contact edge distance falloff in world units (default: 5.25). */
  edgeThickness?: number;
  /** Softness of shore edge transition (default: 0.753). */
  edgeBlur?: number;

  /** Diagonal wave speed (default: 0.257). */
  waveSpeed?: number;
  /** Diagonal wave spatial amount X*Z (default: 0.203). */
  waveAmount?: number;
  /** Vertical undulation peak height (default: 0.282). */
  waveHeight?: number;

  /** HDR multiplier for molten base color (default: 1.48). */
  brightnessUnderLava?: number;
  /** HDR glow multiplier for glowing fissures (default: 4.94). */
  brightnessTopLava?: number;
  /** HDR glow multiplier for shoreline scorch edge (default: 5.0). */
  brightnessEdge?: number;

  /** Emissive breathing pulsation depth (default: 0.15). */
  pulseAmount?: number;
  /** Emissive breathing pulsation frequency (default: 1.5). */
  pulseFrequency?: number;

  /** Custom cellular Voronoi crust texture map (optional). */
  diffuseMap?: Texture;
  /** Alias for diffuseMap. */
  surfaceTexture?: Texture;
  /** High-end 256-color thermal heat lookup texture (ADR 0026, optional). */
  rampMap?: Texture;
  /** Alias for rampMap. */
  blackbodyRamp?: Texture;

  /** Current simulation time in seconds; drives flow, pulse and wave animation (default: 0). */
  time?: number;
}

/**
 * Stylized NPR Lava Material inspired by MinionsArt (Joyce) and Breath of the Wild / Genshin Impact.
 *
 * Features:
 * - Dual-Frequency Flow Distortion (continuous Perlin/Worley noise perturbations)
 * - 3-Tier Stepped NPR Color Hierarchy (Obsidian Basalt -> Molten Magma -> Incandescent Fissures)
 * - Subtractive Non-Overlapping Compositing (prevents HDR bloom blowout)
 * - Dynamic Scene Depth Shoreline Scorching (crust-carved contact edge)
 * - Viscous Diagonal Undulation Wave ($X \cdot Z$ vertex displacement)
 * - Zero-Uniform Thermal Heat Coordinate + 256-Color `RampLUT` support
 */
export class StylizedLavaMaterial extends AbstractMaterial {
  public crustColor: Color;
  public magmaColor: Color;
  public fissureColor: Color;
  public shoreColor: Color;

  public scaleMain: number;
  public scaleDistort: number;
  public distortionStrength: number;

  public speedMainX: number;
  public speedMainY: number;
  public speedDistortX: number;
  public speedDistortY: number;

  public cutoffTop: number;
  public topBlur: number;
  public tintOffset: number;

  public edgeThickness: number;
  public edgeBlur: number;

  public waveSpeed: number;
  public waveAmount: number;
  public waveHeight: number;

  public brightnessUnderLava: number;
  public brightnessTopLava: number;
  public brightnessEdge: number;

  public pulseAmount: number;
  public pulseFrequency: number;

  public diffuseMap: Texture | undefined;
  public rampMap: Texture | undefined;

  /** Current simulation time in seconds; the showcase feeds its loop clock here each frame. */
  public time: number = 0.0;

  constructor(options: StylizedLavaMaterialOptions = {}) {
    super(MaterialType.STYLIZED_LAVA);

    this.crustColor = options.crustColor ?? new Color(0.14, 0.1, 0.11); // #241a1c
    this.magmaColor = options.magmaColor ?? new Color(0.6, 0.2, 0.0); // #983400
    this.fissureColor = options.fissureColor ?? new Color(1.0, 0.4, 0.18); // #ff672d
    this.shoreColor = options.shoreColor ?? new Color(1.0, 0.29, 0.0); // #ff4b00

    this.scaleMain = options.scaleMain ?? 0.328;
    this.scaleDistort = options.scaleDistort ?? 0.325;
    this.distortionStrength = options.distortionStrength ?? 0.292;

    this.speedMainX = options.speedMainX ?? 1.43;
    this.speedMainY = options.speedMainY ?? 1.04;
    this.speedDistortX = options.speedDistortX ?? 0.91;
    this.speedDistortY = options.speedDistortY ?? 1.17;

    this.cutoffTop = options.cutoffTop ?? 0.815;
    this.topBlur = options.topBlur ?? 0.1;
    this.tintOffset = options.tintOffset ?? 1.43;

    this.edgeThickness = options.edgeThickness ?? 5.25;
    this.edgeBlur = options.edgeBlur ?? 0.753;

    this.waveSpeed = options.waveSpeed ?? 0.257;
    this.waveAmount = options.waveAmount ?? 0.203;
    this.waveHeight = options.waveHeight ?? 0.282;

    this.brightnessUnderLava = options.brightnessUnderLava ?? 1.48;
    this.brightnessTopLava = options.brightnessTopLava ?? 4.94;
    this.brightnessEdge = options.brightnessEdge ?? 5.0;

    this.pulseAmount = options.pulseAmount ?? 0.15;
    this.pulseFrequency = options.pulseFrequency ?? 1.5;

    this.diffuseMap = options.diffuseMap ?? options.surfaceTexture;
    this.rampMap = options.rampMap ?? options.blackbodyRamp;
    this.time = options.time ?? 0.0;

    // Depth reading requires transparent render queue with depthWrite
    this.transparent = true;
    this.depthWrite = true;
  }

  public getShaderDefinition(): ShaderDefinition {
    return {
      id: this.type,
      sources: {
        glsl300: {
          vs: vertGLSL,
          fs: fragGLSL,
        },
        wgsl: `${vertWGSL}\n[WGSL_PBR_MATH]\n${fragWGSL}`,
      },
      layout: {
        ...StandardWebGPULayout,
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_rampMap: { type: ShaderPropertyType.TEXTURE },
          u_opaqueDepthMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }

  public getRenderManifest(): RenderManifest {
    if (!this._renderManifest) {
      this._renderManifest = this._createBaseManifest();
    }
    this._syncBaseManifestState();

    const manifest = this._renderManifest;
    const props = manifest.properties as Record<string, unknown>;

    manifest.flags = manifest.flags ?? [];
    manifest.flags.length = 0;

    if (this.diffuseMap) {
      manifest.flags.push("USE_DIFFUSE_MAP");
      manifest.textures["u_diffuseMap"] = this.diffuseMap;
    } else {
      manifest.textures["u_diffuseMap"] = undefined;
    }

    if (this.rampMap) {
      manifest.flags.push("USE_RAMP_MAP");
      manifest.textures["u_rampMap"] = this.rampMap;
    } else {
      manifest.textures["u_rampMap"] = undefined;
    }

    props["u_time"] = this.time;

    props["u_texOffset"] = [0, 0];
    props["u_texRepeat"] = [1, 1];

    props["u_matParam0"] = [
      this.scaleMain,
      this.scaleDistort,
      this.distortionStrength,
      this.pulseFrequency,
    ];
    props["u_matParam1"] = [
      this.speedMainX,
      this.speedMainY,
      this.speedDistortX,
      this.speedDistortY,
    ];
    props["u_matParam2"] = [this.cutoffTop, this.topBlur, this.tintOffset, this.pulseAmount];
    props["u_matParam3"] = [
      this.edgeThickness,
      this.edgeBlur,
      1.0, // depthFalloff
      0.0,
    ];
    props["u_matParam4"] = [this.waveSpeed, this.waveAmount, this.waveHeight, 0.5];
    props["u_matParam5"] = [
      this.brightnessUnderLava,
      this.brightnessTopLava,
      this.brightnessEdge,
      1.0,
    ];
    props["u_matParam6"] = [this.crustColor.r, this.crustColor.g, this.crustColor.b, 1.0];
    props["u_matParam7"] = [this.magmaColor.r, this.magmaColor.g, this.magmaColor.b, 1.0];
    props["u_matParam8"] = [this.fissureColor.r, this.fissureColor.g, this.fissureColor.b, 1.0];
    props["u_matParam9"] = [this.shoreColor.r, this.shoreColor.g, this.shoreColor.b, 1.0];

    return manifest;
  }
}
