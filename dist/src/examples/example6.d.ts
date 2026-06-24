import { AbstractExample } from '../core/index.js';
/**
 * Example 6: Geometry Showcase.
 */
export declare class Example6 extends AbstractExample {
    private _moveSpeed;
    /** @inheritdoc */
    protected setupScene(): Promise<void>;
    protected update(_deltaTime: number): void;
}
