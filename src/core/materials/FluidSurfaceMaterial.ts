import vertGLSL from "./shaders/FluidSurface.vert.glsl?raw";
import fragGLSL from "./shaders/FluidSurface.frag.glsl?raw";
import vertGLSL100 from "./shaders/FluidSurface.vert.glsl100?raw";
import fragGLSL100 from "./shaders/FluidSurface.frag.glsl100?raw";
import vertWGSL from "./shaders/FluidSurface.vert.wgsl?raw";
import fragWGSL from "./shaders/FluidSurface.frag.wgsl?raw";
import { AbstractMaterial } from "./AbstractMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import {
  RenderManifest,
  ShaderDefinition,
  StandardWebGPULayout,
} from "../renderers/shaders/index.js";

/**
 * Configuration options for FluidSurfaceMaterial.
 */
export interface FluidSurfaceMaterialOptions {
  /** The base color of the liquid. */
  color?: Color | undefined;
  /** The color of the edge intersection (foam/crust). */
  edgeColor?: Color | undefined;
  /** The speed of the liquid flow animation. */
  flowSpeed?: number | undefined;
  /** The distortion or noise scale. */
  distortion?: number | undefined;
  /** The viscosity (affects wave frequency/amplitude). */
  viscosity?: number | undefined;
  /** A noise texture map used to generate the flow. */
  noiseMap?: Texture | undefined;
  /** Normal map for surface detail. */
  normalMap?: Texture | undefined;
  /** Glow color for opaque/emissive presets (lava). Defaults to black -- no glow. */
  emissiveColor?: Color | undefined;
  /** Multiplier on `emissiveColor`. 0 disables the glow entirely (the default, plain-fluid look). */
  emissiveStrength?: number | undefined;
}

/**
 * Shared mechanism for opaque/emissive-capable flowing liquid surfaces: noise-driven flow
 * distortion, depth-fade edge blending, and an optional emissive glow. {@link LavaMaterial} and
 * {@link SlimeMaterial} are thin presets on top of this -- see
 * docs/adr/0013-unified-liquid-surface-material.md. Usable directly for a plain flowing liquid.
 */
export class FluidSurfaceMaterial extends AbstractMaterial {
  /** The base color of the fluid. */
  public override color: Color;
  /** The color of the edge intersection. */
  public edgeColor: Color;
  /** The speed of the flow animation. */
  public flowSpeed: number;
  /** The scale of the noise distortion. */
  public distortion: number;
  /** The viscosity (controls wave properties). */
  public viscosity: number;
  /** The current time/frame for animation. */
  public time: number = 0.0;
  /** The noise texture. */
  public noiseMap: Texture | undefined;
  /** Optional normal map. */
  public normalMap: Texture | undefined;
  /** Glow color for opaque/emissive presets (lava). */
  public emissiveColor: Color;
  /** Multiplier on `emissiveColor`. */
  public emissiveStrength: number;

  /**
   * Creates a new FluidSurfaceMaterial.
   * @param options The configuration options.
   * @param type Shader-registry ID to register under -- overridden by presets
   * ({@link LavaMaterial}, {@link SlimeMaterial}) so each gets its own compiled shader instead of
   * colliding on the shared "FluidSurfaceMaterial" ID.
   */
  constructor(
    options: FluidSurfaceMaterialOptions = {},
    type: MaterialType = MaterialType.FLUID_SURFACE,
  ) {
    super(type);
    const {
      color = new Color(0.0, 0.4, 0.8),
      edgeColor = new Color(0.8, 0.9, 1.0),
      flowSpeed = 1.0,
      distortion = 2.0,
      viscosity = 5.0,
      noiseMap = undefined,
      normalMap = undefined,
      emissiveColor = new Color(0.0, 0.0, 0.0),
      emissiveStrength = 0.0,
    } = options;

    this.color = color;
    this.edgeColor = edgeColor;
    this.flowSpeed = flowSpeed;
    this.distortion = distortion;
    this.viscosity = viscosity;
    this.noiseMap = noiseMap;
    this.normalMap = normalMap;
    this.emissiveColor = emissiveColor;
    this.emissiveStrength = emissiveStrength;

    // Set transparency and blending
    this.transparent = true;
    this.depthWrite = false; // Usually true for liquids, but for soft edges we want blending. Let's keep it false for soft edges to work well, or true if we want opaque body. Let's stick to true transparent for now.
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = this._createBaseManifest();
      this._renderManifest.properties["u_specColor"] = this.edgeColor.toFloat32Array();
      // u_extraParams.x and u_liquidParams.z/.w are unread by the base flow shader (x was a
      // fixed 1.0 placeholder, z/w always 0) -- repurposed to carry emissiveColor.rgb
      // (pre-multiplied by emissiveStrength) for opaque/emissive presets like LavaMaterial.
      this._renderManifest.properties["u_extraParams"] = [
        this.emissiveColor.r * this.emissiveStrength,
        this.time,
        this.flowSpeed,
        this.distortion,
      ];
      this._renderManifest.properties["u_liquidParams"] = [
        this.viscosity,
        0.05, // wave amplitude derived from viscosity or fixed
        this.emissiveColor.g * this.emissiveStrength,
        this.emissiveColor.b * this.emissiveStrength,
      ];
      this._renderManifest.textures["u_diffuseMap"] = this.noiseMap;
    }

    this._syncBaseManifestState();

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_specColor"] = this.edgeColor.toFloat32Array();

    const extra = props["u_extraParams"] as number[];
    extra[0] = this.emissiveColor.r * this.emissiveStrength;
    extra[1] = this.time;
    extra[2] = this.flowSpeed;
    extra[3] = this.distortion;

    const liquid = props["u_liquidParams"] as number[];
    liquid[0] = this.viscosity;
    liquid[2] = this.emissiveColor.g * this.emissiveStrength;
    liquid[3] = this.emissiveColor.b * this.emissiveStrength;

    texs["u_diffuseMap"] = this.noiseMap;
    if (this.normalMap) texs["u_normalMap"] = this.normalMap;

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
        wgsl: `${vertWGSL}\n[WGSL_PBR_MATH]\n${fragWGSL}`,
      },
      layout: {
        ...StandardWebGPULayout,
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
          u_opaqueDepthMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
