/// src/interfaces/EngineConfig.ts

import { ProjectionType, RendererType } from "../enums/index.js";

export interface EngineRendererConfig {
  type: RendererType | string;
  attributes?: Record<string, unknown>;
}

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
