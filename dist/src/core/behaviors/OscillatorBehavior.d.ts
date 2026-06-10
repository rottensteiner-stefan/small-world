import { Behavior } from './Behavior.js';
import { OscillatorType } from '../../enums/OscillatorType.js';
/**
 * Configuration options for the OscillatorBehavior.
 */
export interface OscillatorOptions {
    /** The mathematical function to use. Defaults to SINE. */
    type?: OscillatorType;
    /** How strong the oscillation is. Defaults to 1.0. */
    amplitude?: number;
    /** How fast the oscillation is. Defaults to 1.0. */
    frequency?: number;
    /** The base value offset. Defaults to 0.0. */
    offset?: number;
    /**
     * Callback executed every frame with the new oscillating value.
     * This is where you apply the value to your target (e.g. position, scale, intensity).
     */
    onUpdate: (value: number, deltaTime: number) => void;
}
/**
 * A generalized behavior that encapsulates mathematical oscillation (Sine, Noise, etc.).
 * It does not know *what* it is animating, it only generates a value and calls the `onUpdate` callback.
 */
export declare class OscillatorBehavior extends Behavior {
    type: OscillatorType;
    amplitude: number;
    frequency: number;
    offset: number;
    onUpdate: (value: number, deltaTime: number) => void;
    private _time;
    /**
     * Creates a new OscillatorBehavior.
     * @param options Configuration options including the mandatory `onUpdate` callback.
     */
    constructor(options: OscillatorOptions);
    update(deltaTime: number): void;
}
