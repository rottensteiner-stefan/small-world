import { Renderer, EngineConfig } from '../interfaces/index.js';
import { RendererType } from '../enums/index.js';
/**
 * Factory for creating renderer instances.
 */
export declare class RendererFactory {
    /**
     * Creates a new renderer instance based on the given type.
     */
    static create(type: RendererType | string, canvas: HTMLCanvasElement, config?: EngineConfig): Promise<Renderer>;
}
