import { ForgeTool, ForgeToolOptions } from './forge/ForgeTool.js';
import { EventDispatcherImpl } from '../core/index.js';
export declare class Xtractor extends ForgeTool {
    private events;
    loadFromBase64?: (base64: string) => void;
    onPasteImage(base64: string): void;
    constructor(events: EventDispatcherImpl, options?: ForgeToolOptions);
    private _injectCSS;
    private _buildUI;
    private _bindLogic;
    getState(): unknown;
    setState(_state: unknown): void;
}
