import { Renderer, EngineConfig } from '../interfaces/index.js';
import { RendererType } from '../enums/index.js';
/**
 * Factory for creating renderer instances.
 */
export declare class RendererFactory {
    /**
     * Creates a new renderer instance based on the given type.
     * @param type The type of renderer to create.
     * @param canvas The canvas element to initialize the renderer with.
     * @returns A promise that resolves to the created renderer instance.
     */
    static create(type: RendererType | string, canvas: HTMLCanvasElement, config?: EngineConfig): Promise<Renderer>;
}
