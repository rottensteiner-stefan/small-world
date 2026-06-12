import { Behavior } from './Behavior.js';
import { AbstractLight } from '../lights/AbstractLight.js';
/**
 * Configuration options for the EmissivePulsateBehavior.
 */
export interface EmissivePulsateBehaviorOptions {
    /** Minimum emissive intensity. Defaults to 0.5. */
    minIntensity?: number;
    /** Maximum emissive intensity. Defaults to 3.0. */
    maxIntensity?: number;
    /** Minimum duration of one full pulsation cycle in seconds. Defaults to 2.0. */
    minDuration?: number;
    /** Maximum duration of one full pulsation cycle in seconds. Defaults to 5.0. */
    maxDuration?: number;
    /** Optional light source that pulsates in sync with the emissive material. */
    light?: AbstractLight;
    /** Optional multiplier for the light intensity. Defaults to 1.0 (light intensity = emissive intensity * multiplier). */
    lightIntensityMultiplier?: number;
}
/**
 * A behavior that pulsates the emissive intensity of its target's material.
 */
export declare class EmissivePulsateBehavior extends Behavior {
    minIntensity: number;
    maxIntensity: number;
    minDuration: number;
    maxDuration: number;
    light: AbstractLight | undefined;
    lightIntensityMultiplier: number;
    private _time;
    private _currentDuration;
    private _randomOffset;
    /**
     * Creates a new EmissivePulsateBehavior.
     * @param options Configuration options.
     */
    constructor(options?: EmissivePulsateBehaviorOptions);
    /** @inheritdoc */
    update(deltaTime: number): void;
}
