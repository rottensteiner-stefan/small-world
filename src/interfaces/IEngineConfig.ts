/// src/interfaces/IEngineConfig.ts
import { RendererType } from "../enums/RendererType.js";
import { ProjectionType } from "../enums/ProjectionType.js"; // <-- NEU

export interface IEngineConfig {
  canvasId?: string;
  fullscreen?: boolean;
  height?: number;
  projection?: ProjectionType;
  renderer?: RendererType;
  width?: number;
}
