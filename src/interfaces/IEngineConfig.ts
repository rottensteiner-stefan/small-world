/// src/interfaces/IEngineConfig.ts
import { ProjectionType, RendererType } from "../enums/index.js";

export interface IEngineConfig {
  canvasId?: string;
  fullscreen?: boolean;
  height?: number;
  projection?: ProjectionType;
  renderer?: RendererType;
  width?: number;
}
