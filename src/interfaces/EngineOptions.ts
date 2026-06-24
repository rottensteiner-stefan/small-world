/// src/interfaces/EngineOptions.ts

import { ProjectionType, RendererType, InputMode } from "../enums/index.js";
import type { AbstractProjection } from "../math/projections/index.js";

/**
 * Configuration for a single renderer backend.
 */
export interface EngineRendererConfig {
  /** The type of the renderer (e.g., WEB_GL2, WEB_GPU). */
  type: RendererType | string;
  /** Context attributes passed to getContext(). */
  attributes?: Record<string, unknown>;
}

/**
 * Tone mapping algorithms for HDR rendering.
 */
export const ToneMapping = {
  /** No tone mapping applied. */
  NONE: "none",
  /** Reinhard tone mapping. */
  REINHARD: "reinhard",
  /** ACES Filmic tone mapping. */
  ACES: "aces",
} as const;

/** Type definition for ToneMapping. */
export type ToneMapping = (typeof ToneMapping)[keyof typeof ToneMapping];

/**
 * Quality settings for the engine.
 */
export interface QualityConfig {
  /** Global toggle for mipmapping. Defaults to true. */
  mipmapping?: boolean;
  /** Maximum anisotropic filtering level (1, 4, 8, 16). Defaults to 4. */
  maxAnisotropy?: number;
  /** Antialiasing (MSAA) level (0, 2, 4, 8). Defaults to 4. */
  msaa?: number;
  /** Maximum shadow map resolution. Defaults to 1024. */
  maxShadowResolution?: number;
  /** Whether to enable HDR rendering. Defaults to false. */
  hdr?: boolean;
  /** The tone mapping algorithm to use. Defaults to NONE. */
  toneMapping?: ToneMapping;
  /** Global gamma factor for color correction. Defaults to 2.2. */
  gamma?: number;
  /** Global exposure factor for brightness control. Defaults to 1.0. */
  exposure?: number;
}

/**
 * Projection-specific startup parameters.
 * Passed through EngineOptions and consumed by each projection's fromConfig factory.
 */
export interface ProjectionOptions {
  /** Field of view in radians (Perspective only). Defaults to 75°. */
  fov?: number;
  /** Near clip plane distance. Defaults to 0.1. */
  near?: number;
  /** Far clip plane distance. Defaults to 1000. */
  far?: number;
  /** Half-height of the orthographic/oblique view volume. Defaults to 10. */
  orthoSize?: number;
}

/**
 * Global engine configuration options.
 */
export interface EngineOptions {
  /** The ID of the canvas element in the DOM. Defaults to "SmallWorld". */
  canvasId?: string;
  /** Whether the engine should automatically resize the canvas to full screen. */
  fullscreen?: boolean;
  /** Fixed height in pixels (ignored if fullscreen is true). */
  height?: number;
  /** Fixed width in pixels (ignored if fullscreen is true). */
  width?: number;
  /** Default camera projection type. */
  projectionType?: ProjectionType;
  /** Primary renderer type to attempt initialization. */
  rendererType?: RendererType;
  /** The behavior of horizontal input keys (A/D). Defaults to TANK. */
  inputMode?: InputMode;
  /** Detailed renderer configurations. */
  renderer?: EngineRendererConfig[];
  /** Optional quality settings. */
  quality?: QualityConfig;
  /** Optional post-processing settings. */
  postProcessing?: PostProcessingConfig;
  /** Projection startup parameters (near, far, fov, orthoSize). */
  projectionOptions?: ProjectionOptions;
  /**
   * A fully constructed projection instance.
   * When provided, projectionOptions and projection type are ignored.
   * Use this to supply a custom or third-party projection.
   */
  projectionInstance?: AbstractProjection;
  /** Whether to enable the built-in Gadget Inspector overlay (defaults to false/true depending on setup). */
  enableInspector?: boolean;
}

/**
 * Configuration for post-processing effects.
 */
export interface PostProcessingConfig {
  enabled?: boolean;
  filterMode?: number;
  toneMapping?: {
    enabled?: boolean;
    mode?: number;
    exposure?: number;
    gamma?: number;
  };
  vignette?: {
    enabled?: boolean;
    offset?: number;
    darkness?: number;
    roundness?: number;
  };
  grain?: {
    enabled?: boolean;
    intensity?: number;
  };
  bloom?: {
    enabled?: boolean;
    threshold?: number;
    softThreshold?: number;
    intensity?: number;
    radius?: number;
    color?: { r: number; g: number; b: number } | [number, number, number];
  };
}
