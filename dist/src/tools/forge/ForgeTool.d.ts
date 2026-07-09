export interface ForgeToolOptions {
    parent?: HTMLElement;
    initialState?: unknown;
}
export declare abstract class ForgeTool {
    protected _container: HTMLElement;
    protected _options: ForgeToolOptions;
    constructor(options?: ForgeToolOptions);
    mount(parent: HTMLElement): void;
    unmount(): void;
    getContainer(): HTMLElement;
    resize(_w: number, _h: number): void;
    abstract getState(): unknown;
    abstract setState(state: unknown): void;
}
