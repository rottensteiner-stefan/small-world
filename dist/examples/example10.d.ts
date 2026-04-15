import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 10: Textured Floor & Fire Bowl.
 * Shows how to compose objects from primitives and apply textures.
 */
export declare class Example10 extends AbstractExample {
    private readonly _moveSpeed;
    private readonly _eyeHeight;
    private _rockTexture;
    private _lavaTexture;
    private _lavaNormalMap;
    private _lavaSpecularMap;
    /** @inheritdoc */
    protected setupScene(): Promise<void>;
    /** @inheritdoc */
    protected update(deltaTime: number): void;
    /** @inheritdoc */
    protected getDebugInfo(): Record<string, string | number>;
}
