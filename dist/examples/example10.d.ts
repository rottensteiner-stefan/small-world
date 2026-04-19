import { AbstractExample } from '../src/core/example/AbstractExample.js';
/**
 * Example 10: Textured Floor & Organic Fire Bowls.
 * Final polished version with wavy lava and clean engine logic.
 */
export declare class Example10 extends AbstractExample {
    private readonly _moveSpeed;
    private readonly _eyeHeight;
    private _lavaTexture;
    private _lavaNormalMap;
    private _lavaSpecularMap;
    private _lavaCircles;
    private _lavaOriginalVertices;
    private _lavaLights;
    private _noise;
    private _time;
    protected setupScene(): Promise<void>;
    protected update(deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
}
