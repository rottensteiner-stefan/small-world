import { AbstractExample } from '../core/example/AbstractExample.js';
/**
 * Example 6: Geometry Showcase.
 */
export declare class Example6 extends AbstractExample {
    private _moveSpeed;
    protected onCanvasRecreated(): void;
    /** @inheritdoc */
    protected setupScene(): Promise<void>;
    protected update(_deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
}
