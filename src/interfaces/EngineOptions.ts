import { ProjectionType, RendererType, InputMode, ToneMappingMode } from "../enums/index.js";
import { AbstractProjection } from "../math/projections/index.js";
/**
 * Configuration for a single renderer backend.
 */
export interface RendererBackendConfig {
  /** Context attributes passed to getContext(). */
  attributes?: Record<string, unknown>;
}

/**
 * Per-backend renderer settings, keyed by backend rather than a `{ type, ... }` array --
 * see `docs/adr/0001-config-shape-named-keys-not-tagged-arrays.md`.
 */
export interface RendererConfig {
  WEB_GPU?: RendererBackendConfig;
  WEB_GL2?: RendererBackendConfig;
  WEB_GL1?: RendererBackendConfig;
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
  /** Global toggle to disable all textures (renders default fallback textures). Defaults to false. */
  disableTextures?: boolean;
  /** Whether to automatically downgrade settings (disable HDR, MSAA, etc.) on low-end devices. Defaults to true. */
  autoDowngrade?: boolean;
  /** Maximum device pixel ratio (DPR) to use. Useful to clamp rendering resolution on 3x mobile displays. Defaults to Math.min(window.devicePixelRatio, 2). */
  maxPixelRatio?: number;
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
  /** Per-backend renderer configuration, keyed by backend (`WEB_GPU`/`WEB_GL2`/`WEB_GL1`). */
  renderer?: RendererConfig;
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
  /** Whether to step the built-in `PhysicsSystem` (`this.physics`) automatically every frame. Defaults to false. */
  enablePhysics?: boolean;
  /** Initial gravity vector for the built-in physics system, e.g. `[0, -9.81, 0]`. Defaults to the `PhysicsSystem` default. */
  gravity?: [number, number, number];
}

/**
 * Per-effect settings for the post-processing pipeline, nested under `PostProcessingConfig.effects`
 * rather than a `{ type, ... }` array -- see `docs/adr/0001-config-shape-named-keys-not-tagged-arrays.md`.
 */
export interface PostProcessingEffectsConfig {
  toneMapping?: {
    enabled?: boolean;
    mode?: ToneMappingMode;
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
  quantize?: {
    enabled?: boolean;
    steps?: number;
  };
  /** Simplified screen-space ambient occlusion (HBAO, not GTAO). WebGL2/WebGPU only, off by default. */
  hbao?: {
    enabled?: boolean;
    radius?: number;
    intensity?: number;
  };
  /** Simplified TAA (jitter + history blend, no motion vectors). WebGL2/WebGPU only, off by default. */
  taa?: {
    enabled?: boolean;
    feedback?: number;
  };
  /** Deliberate ghost/afterimage motion-trail effect (not anti-aliasing). WebGL2/WebGPU only, off by default. */
  motionTrail?: {
    enabled?: boolean;
    feedback?: number;
  };
}

/**
 * Configuration for post-processing effects.
 */
export interface PostProcessingConfig {
  enabled?: boolean;
  filterMode?: number;
  effects?: PostProcessingEffectsConfig;
}
