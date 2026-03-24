import { RendererType } from './index.js';
import { RendererInterface } from '../interfaces/index.js';
export interface WorldConfig {
    rendererType?: RendererType | string;
    canvasId: string;
    debug?: boolean;
    worldSize?: number;
    skyColor?: string;
    showHUD?: boolean;
}
export declare class SmallWorld {
    config: WorldConfig;
    activeRenderer: RendererInterface;
    constructor();
    init(configPath: string): Promise<void>;
}
