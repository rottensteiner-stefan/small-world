import { ForgeTool } from './ForgeTool.js';
export declare class ForgeWindow {
    static _maxZIndex: number;
    private _windowEl;
    private _contentEl;
    private _tool;
    private _onClose?;
    private _title;
    private _persistenceKey;
    constructor(title: string, parent: HTMLElement, x?: number, y?: number, persistenceKey?: string);
    mountTool(tool: ForgeTool): void;
    get title(): string;
    get tool(): ForgeTool | null;
    getElement(): HTMLDivElement;
    get isVisible(): boolean;
    toggleVisibility(forceState?: boolean): void;
    restoreState(): void;
    bringToFront(): void;
    setOnClose(cb: () => void): void;
    close(): void;
    destroy(): void;
    private _bindDrag;
    private _bindResize;
}
