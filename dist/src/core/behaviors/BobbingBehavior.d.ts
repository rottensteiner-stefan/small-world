import { Behavior } from './Behavior.js';
/**
 * Makes an object bob up and down on the Y-axis using a sine wave.
 * Ideal for floating power-ups, boats, or hovering items.
 */
export declare class BobbingBehavior extends Behavior {
    amplitude: number;
    frequency: number;
    private _time;
    private _startY;
    private _isInitialized;
    /**
     * @param amplitude How high/low the object bobs (in world units).
     * @param frequency How fast the object bobs.
     */
    constructor(amplitude?: number, frequency?: number);
    update(deltaTime: number): void;
}
