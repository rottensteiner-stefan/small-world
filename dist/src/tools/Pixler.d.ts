import { ForgeTool, ForgeToolOptions } from './forge/ForgeTool.js';
export declare const PIXLER_PALETTES: {
    DEFAULT: string[];
    EGA: string[];
    VGA: string[];
    PICO8: string[];
    GAMEBOY: string[];
    GRAYSCALE: string[];
};
export interface PixlerOptions extends ForgeToolOptions {
    width?: number;
    height?: number;
    gridX?: number;
    gridY?: number;
    scale?: number;
    palette?: string[];
}
export declare class Pixler extends ForgeTool {
    private _canvas;
    private _ctx;
    private _gridOverlay;
    private _cursorEl;
    private _paletteContainer;
    private _width;
    private _height;
    private _gridX;
    private _gridY;
    private _scale;
    private _inputs;
    private _currentColor;
    private _isDrawing;
    private _isErasing;
    private _cursorPos;
    private _palette;
    constructor(options?: PixlerOptions);
    private _createInput;
    private _resize;
    private _updateGrid;
    private _updateCursorVisual;
    loadTemplateA2Z(): void;
    private _drawPixel;
    private _isSameColor;
    private _bindEvents;
    private _renderPaletteUI;
    get width(): number;
    set width(v: number);
    get height(): number;
    set height(v: number);
    get gridX(): number;
    set gridX(v: number);
    get gridY(): number;
    set gridY(v: number);
    getBase64(): string;
    loadFromBase64(base64: string): Promise<void>;
    setPalette(colors: string[]): void;
    onPasteImage(base64: string): void;
    getState(): unknown;
    setState(state: unknown): void;
}
