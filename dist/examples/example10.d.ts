import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 10: Textured Floor & Fire Bowl with Bubbling Lava.
 * Shows how to compose objects from primitives and apply vertex-displacement using SimplexNoise.
 */
export declare class Example10 extends AbstractExample {
    private readonly _moveSpeed;
    private readonly _eyeHeight;
    private _rockTexture;
    private _lavaTexture;
    private _lavaNormalMap;
    private _lavaSpecularMap;
    private _lavaPlanes;
    private _lavaOriginalVertices;
    private _noise;
    private _time;
    /** @inheritdoc */
    protected setupScene(): Promise<void>;
    /** @inheritdoc */
    protected update(deltaTime: number): void;
    /** @inheritdoc */
    protected getDebugInfo(): Record<string, string | number>;
}
