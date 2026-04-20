import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 5: Grid-based Movement with Enemies.
 */
export declare class Example5 extends AbstractExample {
    private _player;
    private _clickMarker;
    private _enemies;
    private _targetPos;
    private _mouseWasDown;
    private _isMoving;
    private _moveProgress;
    private _moveStart;
    private _moveEnd;
    private _moveDuration;
    protected setupScene(): Promise<void>;
    private _createActor;
    protected update(deltaTime: number): void;
    private _startMove;
    protected getDebugInfo(): Record<string, string | number>;
}
