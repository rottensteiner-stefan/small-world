export interface ForgeToolOptions {
    parent?: HTMLElement;
    initialState?: unknown;
    events?: import('../../interfaces/index.js').Events;
}
export declare abstract class ForgeTool {
    protected _container: HTMLElement;
    protected _options: ForgeToolOptions;
    constructor(options?: ForgeToolOptions);
    mount(parent: HTMLElement): void;
    unmount(): void;
    getContainer(): HTMLElement;
    resize(_w: number, _h: number): void;
    onPasteImage(_base64: string): void;
    abstract getState(): unknown;
    abstract setState(state: unknown): void;
}
