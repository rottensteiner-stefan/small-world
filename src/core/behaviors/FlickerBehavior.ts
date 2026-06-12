/// src/core/behaviors/FlickerBehavior.ts

import { Behavior } from "./Behavior.js";
import { Object3D } from "../Object3D.js";
import { Noise } from "../../utils/Noise.js";

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
export class FlickerBehavior extends Behavior {
  public options: Required<FlickerBehaviorOptions>;

  private _timeAcc: number = 0;
  private _flickerTimer: number = 0;
  private _isFlickering: boolean = false;
  private _targetMultiplier: number = 1.0;
  private _currentMultiplier: number = 1.0;

  /**
   * Creates a new FlickerBehavior.
   * @param options Configuration options.
   */
  constructor(options: FlickerBehaviorOptions) {
    super();

    this.options = {
      minStableTime: options.minStableTime ?? 2.0,
      maxStableTime: options.maxStableTime ?? 6.0,
      minFlickerTime: options.minFlickerTime ?? 0.2,
      maxFlickerTime: options.maxFlickerTime ?? 1.5,
      minMultiplier: options.minMultiplier ?? 0.0,
      smoothness: Math.max(0, Math.min(1, options.smoothness ?? 0.0)),
      onUpdate: options.onUpdate,
    };
  }

  public override update(deltaTime: number): void {
    if (!this.target) return;

    this._timeAcc += deltaTime;
    this._flickerTimer -= deltaTime;

    // 1. Phase Management: Swap between stable and flickering
    if (this._flickerTimer <= 0) {
      if (this._isFlickering) {
        this._isFlickering = false;
        const range = this.options.maxStableTime - this.options.minStableTime;
        this._flickerTimer = this.options.minStableTime + Math.random() * range;
        this._targetMultiplier = 1.0;
      } else {
        this._isFlickering = true;
        const range = this.options.maxFlickerTime - this.options.minFlickerTime;
        this._flickerTimer = this.options.minFlickerTime + Math.random() * range;
      }
    }

    // 2. Determine target multiplier based on the current phase
    if (this._isFlickering) {
      if (this.options.smoothness > 0.0) {
        const n = Noise.simplex2(this._timeAcc * 15.0, 0);
        const normalized = (n + 1) / 2;
        this._targetMultiplier =
          this.options.minMultiplier + normalized * (1.0 - this.options.minMultiplier);
      } else {
        if (Math.random() > 0.6) {
          const rand = Math.random();
          if (rand > 0.8) {
            this._targetMultiplier = this.options.minMultiplier;
          } else if (rand > 0.5) {
            this._targetMultiplier =
              this.options.minMultiplier + Math.random() * (1.0 - this.options.minMultiplier);
          } else {
            this._targetMultiplier = 1.0;
          }
        }
      }
    } else {
      this._targetMultiplier = 1.0;
    }

    // 3. Apply smoothness (Lerp)
    if (this.options.smoothness > 0) {
      const lerpSpeed = 30.0 * (1.0 - this.options.smoothness) + 2.0;
      this._currentMultiplier +=
        (this._targetMultiplier - this._currentMultiplier) * Math.min(deltaTime * lerpSpeed, 1.0);
    } else {
      this._currentMultiplier = this._targetMultiplier;
    }

    // 4. Pass the calculated multiplier to the callback
    this.options.onUpdate(this._currentMultiplier, this.target as Object3D);
  }
}
