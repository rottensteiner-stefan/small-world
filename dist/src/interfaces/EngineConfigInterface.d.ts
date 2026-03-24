import { ProjectionType, RendererType } from '../enums/index.js';
export interface EngineConfigInterface {
    canvasId?: string;
    fullscreen?: boolean;
    height?: number;
    projection?: ProjectionType;
    renderer?: RendererType;
    width?: number;
}
