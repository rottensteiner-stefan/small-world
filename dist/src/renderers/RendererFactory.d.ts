import { RendererInterface } from '../interfaces/index.js';
import { RendererType } from '../enums/index.js';
export declare class RendererFactory {
    static create(type: RendererType | string, canvas: HTMLCanvasElement): Promise<RendererInterface>;
}
