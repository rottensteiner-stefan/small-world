import { AbstractExample } from '../core/index.js';
/**
 * Example 10: Textured Floor & Organic Fire Bowls.
 * Fixed: Lava plane corners hidden and bowl bottom added.
 */
export declare class Example10 extends AbstractExample {
    private readonly _moveSpeed;
    private readonly _eyeHeight;
    private readonly _lightPulseSpeed;
    private _lavaTexture;
    private _lavaNormalMap;
    private _lavaDisplacementMap;
    private _lavaSpecularMap;
    private _lavaAmbientMap;
    private _lavaMaterials;
    private _lavaLights;
    private _time;
    protected setupScene(): Promise<void>;
    protected update(deltaTime: number): void;
    protected getDebugInfo(): Record<string, string | number>;
}
