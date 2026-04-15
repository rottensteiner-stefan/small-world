import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 9: Clean rebuild with Skydome, Green Floor, WASD/QE movement.
 */
export declare class Example9 extends AbstractExample {
    private readonly _moveSpeed;
    private readonly _eyeHeight;
    private _skydome;
    protected setupScene(): Promise<void>;
    protected update(deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
}
