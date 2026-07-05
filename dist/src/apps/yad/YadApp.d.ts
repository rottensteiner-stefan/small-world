import { AbstractShowcase } from '../../index.js';
/**
 * YAD (Yet Another Doom)
 * Building a grid-based level from a text file.
 */
export declare class YadApp extends AbstractShowcase {
    private _time;
    private _lavaMaterials;
    private _lavaLights;
    /** @inheritdoc */
    protected onCanvasRecreated(): void;
    /** @inheritdoc */
    protected setupScene(): Promise<void>;
    /** @inheritdoc */
    protected update(deltaTime: number): void;
}
