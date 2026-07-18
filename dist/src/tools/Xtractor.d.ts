import { ForgeTool, ForgeToolOptions } from './forge/ForgeTool.js';
export declare class Xtractor extends ForgeTool {
    loadFromBase64?: (base64: string) => void;
    onPasteImage(base64: string): void;
    constructor(options?: ForgeToolOptions);
    private _injectCSS;
    private _buildUI;
    private _bindLogic;
    getState(): unknown;
    setState(_state: unknown): void;
}
