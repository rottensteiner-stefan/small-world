import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 7: Skybox & FPS Controls.
 * This example demonstrates a pure skybox environment without a physical floor.
 */
export declare class Example7 extends AbstractExample {
    private _moveSpeed;
    private _eyeHeight;
    protected onCanvasRecreated(): void;
    protected setupScene(): Promise<void>;
    protected update(_deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
}
