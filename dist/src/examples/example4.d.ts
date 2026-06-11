import { AbstractExample } from '../core/index.js';
export declare class Example4 extends AbstractExample {
    private _targetPos;
    private _car;
    private _terrainManager;
    protected setupScene(): Promise<void>;
    protected onCanvasRecreated(): void;
    protected update(deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
}
