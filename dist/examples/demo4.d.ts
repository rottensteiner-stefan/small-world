import { AbstractDemo } from './AbstractDemo.js';
export declare class Demo4 extends AbstractDemo {
    private targetPos;
    private _car;
    private _terrainManager;
    protected setupScene(): Promise<void>;
    protected update(deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
}
