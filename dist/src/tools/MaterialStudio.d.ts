import { ForgeTool, ForgeToolOptions } from './forge/ForgeTool.js';
declare global {
    interface Window {
        update3DTextures?: (diffuseCanvas: HTMLCanvasElement, normalCanvas: HTMLCanvasElement, roughnessCanvas: HTMLCanvasElement, normalStrength: number, metallicValue: number, roughnessValue: number) => Promise<void>;
        update3DGeometry?: (geomType: string) => void;
    }
}
export declare class MaterialStudio extends ForgeTool {
    private _app;
    private _canvas;
    constructor(options?: ForgeToolOptions);
    private _injectCSS;
    private _buildUI;
    private _bindLogic;
    mount(container: HTMLElement): void;
    unmount(): void;
    resize(width: number, height: number): void;
}
