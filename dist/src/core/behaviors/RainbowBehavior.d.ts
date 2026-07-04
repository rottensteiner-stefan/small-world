import { Behavior } from './Behavior.js';
/**
 * Shifts the color of a Material or Light continuously through the HSL spectrum.
 */
export declare class RainbowBehavior extends Behavior {
    speed: number;
    private _hue;
    /**
     * @param speed The speed of the color transition (hue shift per second).
     */
    constructor(speed?: number);
    update(deltaTime: number): void;
}
