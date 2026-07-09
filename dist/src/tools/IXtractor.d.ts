import { ForgeTool, ForgeToolOptions } from './forge/ForgeTool.js';
export declare class IXtractor extends ForgeTool {
    constructor(options?: ForgeToolOptions);
    private _injectCSS;
    private _buildUI;
    private _bindLogic;
    getState(): unknown;
    setState(_state: unknown): void;
}
