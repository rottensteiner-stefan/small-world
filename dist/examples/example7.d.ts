import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 7: Clean rebuild with Skybox, Green Floor, WASD/QE movement.
 */
export declare class Example7 extends AbstractExample {
    private _moveSpeed;
    private _eyeHeight;
    protected onCanvasRecreated(): void;
    protected setupScene(): Promise<void>;
    protected update(deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
}
