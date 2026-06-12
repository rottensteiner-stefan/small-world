import { Behavior } from './Behavior.js';
import { Object3D } from '../Object3D.js';
/**
 * Configuration options for the FlickerBehavior.
 */
export interface FlickerBehaviorOptions {
    /** Minimum duration of the stable (fully on) phase in seconds. Defaults to 2.0. */
    minStableTime?: number;
    /** Maximum duration of the stable phase in seconds. Defaults to 6.0. */
    maxStableTime?: number;
    /** Minimum duration of the flickering phase in seconds. Defaults to 0.2. */
    minFlickerTime?: number;
    /** Maximum duration of the flickering phase in seconds. Defaults to 1.5. */
    maxFlickerTime?: number;
    /** The lowest the multiplier can drop during flickering. Defaults to 0.0. */
    minMultiplier?: number;
    /**
     * How smooth the transitions are. 0 = instant cuts (like broken electronics),
     * 1 = smooth sine-like organic transitions. Defaults to 0.0.
     */
    smoothness?: number;
    /** The callback that applies the flicker multiplier (0.0 to 1.0). */
    onUpdate: (multiplier: number, targetObj: Object3D) => void;
}
/**
 * A generalized behavior that encapsulates a flickering/glitching value (e.g. for broken lights, sparks, UI glitches).
 * It calculates a multiplier (0.0 to 1.0) and passes it to the `onUpdate` callback.
 */
export declare class FlickerBehavior extends Behavior {
    options: Required<FlickerBehaviorOptions>;
    private _timeAcc;
    private _flickerTimer;
    private _isFlickering;
    private _targetMultiplier;
    private _currentMultiplier;
    /**
     * Creates a new FlickerBehavior.
     * @param options Configuration options.
     */
    constructor(options: FlickerBehaviorOptions);
    update(deltaTime: number): void;
}
