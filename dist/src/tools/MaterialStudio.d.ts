import { ForgeTool, ForgeToolOptions } from './forge/ForgeTool.js';
import { SmallWorld } from '../core/index.js';
declare global {
    interface Window {
        update3DTextures?: (diffuseCanvas: HTMLCanvasElement, normalCanvas: HTMLCanvasElement, roughnessCanvas: HTMLCanvasElement, normalStrength: number, metallicValue: number, roughnessValue: number) => Promise<void>;
        update3DGeometry?: (geomType: string) => void;
    }
}
export declare class MaterialStudioApp extends SmallWorld {
    private _previewObject;
    private _pbrMaterial;
    private _time;
    private _sphereGeometry;
    private _cubeGeometry;
    private _torusGeometry;
    private _planeGeometry;
    constructor(canvasId: string);
    protected setupScene(): Promise<void>;
    protected update(deltaTime: number): void;
}
export declare class MaterialStudio extends ForgeTool {
    private _app;
    private _canvas;
    private _onBase64Image;
    constructor(options?: ForgeToolOptions);
    getState(): unknown;
    setState(_state: unknown): void;
    private _injectCSS;
    private _buildUI;
    private _bindLogic;
    mount(container: HTMLElement): void;
    onPasteImage(base64: string): void;
    unmount(): void;
    resize(width: number, height: number): void;
}
