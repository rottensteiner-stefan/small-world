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
}

/**
 * A robust material for rendering fluid surfaces like water, lava, or slime with depth fade.
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

  /**
   * Creates a new FluidSurfaceMaterial.
   * @param options The configuration options.
   */
  constructor(options: FluidSurfaceMaterialOptions = {}) {
    super(MaterialType.FLUID_SURFACE);
    const {
      color = new Color(0.0, 0.4, 0.8),
      edgeColor = new Color(0.8, 0.9, 1.0),
      flowSpeed = 1.0,
      distortion = 2.0,
      viscosity = 5.0,
      noiseMap = undefined,
      normalMap = undefined,
    } = options;

    this.color = color;
    this.edgeColor = edgeColor;
    this.flowSpeed = flowSpeed;
    this.distortion = distortion;
    this.viscosity = viscosity;
    this.noiseMap = noiseMap;
    this.normalMap = normalMap;

    // Set transparency and blending
    this.transparent = true;
    this.depthWrite = false; // Usually true for liquids, but for soft edges we want blending. Let's keep it false for soft edges to work well, or true if we want opaque body. Let's stick to true transparent for now.
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    if (undefined === this._renderManifest) {
      this._renderManifest = this._createBaseManifest();
      this._renderManifest.properties["u_specColor"] = this.edgeColor.toFloat32Array();
      this._renderManifest.properties["u_extraParams"] = [
        1.0,
        this.time,
        this.flowSpeed,
        this.distortion,
      ];
      this._renderManifest.properties["u_liquidParams"] = [
        this.viscosity,
        0.05, // wave amplitude derived from viscosity or fixed
        0,
        0,
      ];
      this._renderManifest.textures["u_diffuseMap"] = this.noiseMap;
    }

    this._syncBaseManifestState();

    const props = this._renderManifest.properties as Record<string, unknown>;
    const texs = this._renderManifest.textures as Record<string, unknown>;

    props["u_specColor"] = this.edgeColor.toFloat32Array();

    const extra = props["u_extraParams"] as number[];
    extra[1] = this.time;
    extra[2] = this.flowSpeed;
    extra[3] = this.distortion;

    const liquid = props["u_liquidParams"] as number[];
    liquid[0] = this.viscosity;

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
