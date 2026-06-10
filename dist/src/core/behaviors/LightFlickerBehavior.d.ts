import { Behavior } from './Behavior.js';
import { Color } from '../colors/Color.js';
/**
 * Configuration options for the LightFlickerBehavior.
 */
export interface LightFlickerOptions {
    /** The normal intensity of the light. Defaults to 1.0. */
    baseIntensity?: number;
    /** Minimum time in seconds the light stays perfectly on. Defaults to 2.0. */
    minStableTime?: number;
    /** Maximum time in seconds the light stays perfectly on. Defaults to 6.0. */
    maxStableTime?: number;
    /** Minimum time in seconds a flicker phase lasts. Defaults to 0.2. */
    minFlickerTime?: number;
    /** Maximum time in seconds a flicker phase lasts. Defaults to 1.5. */
    maxFlickerTime?: number;
    /** The lowest intensity multiplier during flicker (0.0 = completely off, 1.0 = no dimming). Defaults to 0.0. */
    minIntensityMultiplier?: number;
    /** How smooth the flickering is (0.0 = hard cuts, 1.0 = smooth organic). Defaults to 0.0. */
    smoothness?: number;
    /** An optional color to blend towards when the intensity drops. */
    flickerColor?: Color;
}
/**
 * A highly configurable behavior to make a light flicker.
 * Can simulate anything from a broken neon sign (hard cuts) to a campfire (smooth noise).
 */
export declare class LightFlickerBehavior extends Behavior {
    options: Omit<Required<LightFlickerOptions>, "flickerColor"> & {
        flickerColor?: Color;
    };
    private _flickerTimer;
    private _isFlickering;
    private _currentMultiplier;
    private _targetMultiplier;
    private _baseColor;
    private _timeAcc;
    /**
     * Creates a new LightFlickerBehavior.
     * @param options Configuration options or just the baseIntensity as a number.
     */
    constructor(options?: LightFlickerOptions | number);
    onAttach(target: import('../Object3D.js').Object3D | import('../../interfaces/index.js').CameraInterfaceData): void;
    update(deltaTime: number): void;
}
