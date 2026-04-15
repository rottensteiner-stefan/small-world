import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 5: Introduction to 2D elements and Isometric Camera.
 */
export declare class Example5 extends AbstractExample {
    private _player;
    private _targetPos;
    private _isMoving;
    private _moveProgress;
    private _moveStart;
    private _moveEnd;
    private _moveDuration;
    protected setupScene(): Promise<void>;
    protected update(deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
}
