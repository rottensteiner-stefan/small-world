/// src/core/materials/SlimeMaterial.ts

import { LavaMaterial, LavaMaterialOptions } from "./LavaMaterial.js";
import { Color } from "../colors/index.js";
import { MaterialType, ShaderPropertyType } from "../../enums/index.js";
import { Texture } from "../textures/index.js";
import { RenderManifest } from "../renderers/shaders/RenderManifest.js";
import { ShaderDefinition } from "../renderers/shaders/ShaderDefinition.js";

import vertGLSL from "./shaders/Lava.vert.glsl?raw";
import fragGLSL from "./shaders/Lava.frag.glsl?raw";
import vertGLSL100 from "./shaders/Lava.vert.glsl100?raw";
import fragGLSL100 from "./shaders/Lava.frag.glsl100?raw";
import fragWGSL from "./shaders/Lava.frag.wgsl?raw";

/**
 * Configuration options for SlimeMaterial.
 */
export interface SlimeMaterialOptions extends LavaMaterialOptions {
  /** Displacement map for vertex waves. */
  displacementMap?: Texture;
  /** Normal map for surface detail. */
  normalMap?: Texture;
}

/**
 * Specialized animated toxic slime material.
 * Inherits from LavaMaterial but with distinct radioactive defaults and extra map support.
 */
export class SlimeMaterial extends LavaMaterial {
  /** Optional displacement map for smoother waves. */
  public displacementMap: Texture | undefined;
  /** Optional normal map for lighting details. */
  public normalMap: Texture | undefined;

  /**
   * Creates a new SlimeMaterial.
   * @param options The configuration options.
   */
  constructor(options: SlimeMaterialOptions = {}) {
    // radioactive defaults
    const defaults: SlimeMaterialOptions = {
      color: new Color(0.0, 2.5, 0.0),
      crustColor: new Color(0.0, 0.1, 0.0),
      flowSpeed: 0.05,
      noiseScale: 5.0,
      ...options,
    };
    super(defaults, MaterialType.SLIME);
    this.displacementMap = options.displacementMap;
    this.normalMap = options.normalMap;
  }

  /** @inheritdoc */
  public override getRenderManifest(): RenderManifest {
    const manifest = super.getRenderManifest();
    manifest.shaderId = this.type; // Use its own shader ID if we want to specialize

    const texs = manifest.textures as Record<string, unknown>;

    // Add extra textures to the manifest
    if (this.displacementMap) texs["u_displacementMap"] = this.displacementMap;
    if (this.normalMap) texs["u_normalMap"] = this.normalMap;

    return manifest;
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
        wgsl: `[WGSL_STRUCTS]\n${fragWGSL}`,
      },
      layout: {
        uniforms: {
          u_color: { type: ShaderPropertyType.COLOR },
          u_specColor: { type: ShaderPropertyType.COLOR },
          u_time: { type: ShaderPropertyType.FLOAT },
          u_flowSpeed: { type: ShaderPropertyType.FLOAT },
          u_noiseScale: { type: ShaderPropertyType.FLOAT },
        },
        textures: {
          u_diffuseMap: { type: ShaderPropertyType.TEXTURE },
          u_displacementMap: { type: ShaderPropertyType.TEXTURE },
          u_normalMap: { type: ShaderPropertyType.TEXTURE },
        },
      },
    };
  }
}
