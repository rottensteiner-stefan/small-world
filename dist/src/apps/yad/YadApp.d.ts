import { AbstractExample } from '../../index.js';
/**
 * YAD (Yet Another Doom)
 * Building a grid-based level from a text file.
 */
export declare class YadApp extends AbstractExample {
    private _time;
    private _lavaMaterial;
    /** @inheritdoc */
    protected onCanvasRecreated(): void;
    /** @inheritdoc */
    protected setupScene(): Promise<void>;
    /** @inheritdoc */
    protected update(deltaTime: number): void;
    /** @inheritdoc */
    protected getDebugInfo(): Record<string, string | number>;
}
