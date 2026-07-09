import { ForgeTool } from './ForgeTool.js';
export declare class ForgeWindow {
    private _windowEl;
    private _contentEl;
    private _tool;
    private _onClose?;
    private _title;
    constructor(title: string, parent: HTMLElement, x?: number, y?: number);
    mountTool(tool: ForgeTool): void;
    get title(): string;
    get isVisible(): boolean;
    toggleVisibility(): void;
    setOnClose(cb: () => void): void;
    close(): void;
    destroy(): void;
    private _bindDrag;
    private _bindResize;
}
