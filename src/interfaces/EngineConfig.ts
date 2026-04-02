/// src/interfaces/EngineConfig.ts

import { ProjectionType, RendererType } from "../enums/index.js";

export interface EngineRendererConfig {
  type: RendererType | string;
  attributes?: Record<string, unknown>;
}

export interface EngineConfig {
  canvasId?: string;
  fullscreen?: boolean;
  height?: number;
  width?: number;
  projection?: ProjectionType;
  rendererType?: RendererType;
  renderer?: EngineRendererConfig[];
}
