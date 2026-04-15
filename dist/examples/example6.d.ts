import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 6: Showcasing advanced geometries like Capsule, Tube, and Sektors.
 */
export declare class Example6 extends AbstractExample {
    private _targetPos;
    private _moveSpeed;
    /**
     * Called by the constructor of Application OR after a renderer switch (onCanvasRecreated).
     * Ensures that pointer lock works even on a NEW canvas.
     */
    protected onCanvasRecreated(): void;
    /** @inheritdoc */
    protected setupScene(): Promise<void>;
    /** @inheritdoc */
    protected update(deltaTime: number): void;
    /** @inheritdoc */
    protected getDebugInfo(): Record<string, string | number>;
}
