import { Behavior } from './Behavior.js';
import { Object3D } from '../index.js';
/**
 * Configuration options for the PulsatingBehavior.
 */
export interface PulsatingBehaviorOptions {
    /** Minimum value of the pulsation. Defaults to 0.0. */
    min?: number;
    /** Maximum value of the pulsation. Defaults to 1.0. */
    max?: number;
    /** Minimum duration of one full pulsation cycle in seconds. Defaults to 2.0. */
    minDuration?: number;
    /** Maximum duration of one full pulsation cycle in seconds. Defaults to 5.0. */
    maxDuration?: number;
    /** The callback that applies the pulsating value. */
    onUpdate: (value: number, targetObj: Object3D) => void;
}
/**
 * A generic behavior that generates a pulsating value (sine wave) over time
 * and applies it via a callback function.
 */
export declare class PulsatingBehavior extends Behavior {
    min: number;
    max: number;
    minDuration: number;
    maxDuration: number;
    onUpdate: (value: number, targetObj: Object3D) => void;
    private _time;
    private _currentDuration;
    private _randomOffset;
    /**
     * Creates a new PulsatingBehavior.
     * @param options Configuration options.
     */
    constructor(options: PulsatingBehaviorOptions);
    update(deltaTime: number): void;
}
