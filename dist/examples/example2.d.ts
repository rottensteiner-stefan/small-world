import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 2: Interactive camera (FPS-style) and keyboard input.
 * Shows how to move the camera with mouse and keyboard.
 */
export declare class Example2 extends AbstractExample {
    private _moveSpeed;
    /** @inheritdoc */
    protected setupScene(): Promise<void>;
    protected onCanvasRecreated(): void;
    /** @inheritdoc */
    protected update(_deltaTime: number): void;
    /** @inheritdoc */
    protected getDebugInfo(): Record<string, string | number>;
}
