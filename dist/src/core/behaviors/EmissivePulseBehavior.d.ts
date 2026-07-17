import { Behavior } from './Behavior.js';
export interface EmissivePulseOptions {
    /** The base emissive intensity. Defaults to 0.2. */
    baseIntensity?: number;
    /** The speed of the heartbeat pulse. Defaults to 4.0. */
    pulseSpeed?: number;
    /** The maximum amplitude of the pulse. Defaults to 2.0. */
    pulseAmplitude?: number;
}
/**
 * A generic behavior that makes the emissive property of an object's material
 * pulsate in a "heartbeat" rhythm. It automatically modulates StandardMaterial
 * or CustomShaderMaterials that expose an emissive parameter.
 */
export declare class EmissivePulseBehavior extends Behavior {
    baseIntensity: number;
    pulseSpeed: number;
    pulseAmplitude: number;
    private _time;
    constructor(options?: EmissivePulseOptions);
    update(deltaTime: number): void;
}
