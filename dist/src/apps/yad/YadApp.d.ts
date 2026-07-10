import { YadHud } from './YadHud.js';
import { AbstractShowcase } from '../../core/showcase/index.js';
/**
 * YAD (Yet Another Dungeon)
 * Building a grid-based level from a text file.
 */
export declare class YadApp extends AbstractShowcase {
    constructor();
    private _time;
    private _lavaMaterials;
    private _lavaLights;
    private _hud;
    private _playerController;
    get hud(): YadHud;
    /** @inheritdoc */
    protected onCanvasRecreated(): void;
    /** @inheritdoc */
    protected setupScene(): Promise<void>;
    /** @inheritdoc */
    protected update(deltaTime: number): void;
}
