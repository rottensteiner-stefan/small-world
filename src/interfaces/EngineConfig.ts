/// src/interfaces/EngineConfig.ts

import { ProjectionType, RendererType } from "../enums/index.js";
export interface EngineRendererConfig {
  type: RendererType | string;
  attributes?: Record<string, unknown>;
}

/**
 * Tone mapping algorithms.
 */
export const ToneMapping = {
  /** No tone mapping. */
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
  /** Maximum anisotropic filtering level. Usually 1, 4, 8, 16. Defaults to 4. */
  maxAnisotropy?: number;
  /** Antialiasing (MSAA) level. usually 0, 2, 4, 8. Defaults to 4. */
  msaa?: number;
  /** Maximum shadow map resolution. Defaults to 1024. */
  maxShadowResolution?: number;
  /** Whether to enable HDR rendering. Defaults to false. */
  hdr?: boolean;
  /** The tone mapping algorithm to use. Defaults to NONE. */
  toneMapping?: ToneMapping;
}

export interface EngineConfig {
  canvasId?: string;
  fullscreen?: boolean;
  height?: number;
  width?: number;
  projection?: ProjectionType;
  rendererType?: RendererType;
  renderer?: EngineRendererConfig[];
  /** Optional quality settings. */
  quality?: QualityConfig;
}
