/// src/interfaces/EngineConfig.ts

import { ProjectionType, RendererType } from "../enums/index.js";

export interface EngineConfig {
  canvasId?: string;
  fullscreen?: boolean;
  height?: number;
  projection?: ProjectionType;
  renderer?: RendererType;
  width?: number;
}
