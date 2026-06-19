import { AbstractExample } from '../core/index.js';
/**
 * Example 8: Clean rebuild with Skydome, Reference Cubes, WASD/QE movement.
 */
export declare class Example8 extends AbstractExample {
    private readonly _moveSpeed;
    private readonly _eyeHeight;
    private _skydome;
    private _time;
    protected setupScene(): Promise<void>;
    protected update(deltaTime: number): void;
}
