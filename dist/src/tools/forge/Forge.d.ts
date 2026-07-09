import { ForgeWindow } from './ForgeWindow.js';
import { ForgeTool } from './ForgeTool.js';
export interface ForgeOptions {
    toggleKey?: string;
}
export declare class Forge {
    private _overlay;
    private _isVisible;
    private _windows;
    get isVisible(): boolean;
    constructor(options?: ForgeOptions);
    toggle(): void;
    get windows(): ForgeWindow[];
    openWindow(title: string, tool: ForgeTool, x?: number, y?: number): ForgeWindow;
    private _taskbarEl?;
    private _updateTaskbar;
    private _injectCSS;
}
