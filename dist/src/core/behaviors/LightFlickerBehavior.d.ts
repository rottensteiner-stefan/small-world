import { Behavior } from './Behavior.js';
export declare class LightFlickerBehavior extends Behavior {
    baseIntensity: number;
    private _flickerTimer;
    private _isFlickering;
    private _flickerMultiplier;
    constructor(baseIntensity?: number);
    update(deltaTime: number): void;
}
