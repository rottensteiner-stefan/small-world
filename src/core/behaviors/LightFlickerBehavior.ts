/// src/core/behaviors/LightFlickerBehavior.ts

import { Behavior } from "./Behavior.js";
import { AbstractLight } from "../lights/AbstractLight.js";
import { Color } from "../colors/Color.js";
import { Noise } from "../../utils/Noise.js";

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
export class LightFlickerBehavior extends Behavior {
  public options: Omit<Required<LightFlickerOptions>, "flickerColor"> & { flickerColor?: Color };

  private _flickerTimer: number = 0;
  private _isFlickering: boolean = false;

  private _currentMultiplier: number = 1.0;
  private _targetMultiplier: number = 1.0;

  private _baseColor: Color | null = null;
  private _timeAcc: number = 0;

  /**
   * Creates a new LightFlickerBehavior.
   * @param options Configuration options or just the baseIntensity as a number.
   */
  constructor(options: LightFlickerOptions | number = {}) {
    super();

    // Backwards compatibility for old constructor
    if (typeof options === "number") {
      options = { baseIntensity: options };
    }

    this.options = {
      baseIntensity: options.baseIntensity ?? 1.0,
      minStableTime: options.minStableTime ?? 2.0,
      maxStableTime: options.maxStableTime ?? 6.0,
      minFlickerTime: options.minFlickerTime ?? 0.2,
      maxFlickerTime: options.maxFlickerTime ?? 1.5,
      minIntensityMultiplier: options.minIntensityMultiplier ?? 0.0,
      smoothness: Math.max(0, Math.min(1, options.smoothness ?? 0.0)),
    };

    if (options.flickerColor) {
      this.options.flickerColor = options.flickerColor;
    }
  }

  public override onAttach(
    target:
      | import("../Object3D.js").Object3D
      | import("../../interfaces/index.js").CameraInterfaceData,
  ): void {
    super.onAttach(target);
    if (target instanceof AbstractLight) {
      // Save the original color of the light so we can blend back to it
      this._baseColor = new Color(target.color.r, target.color.g, target.color.b, target.color.a);
    }
  }

  public override update(deltaTime: number): void {
    if (!this.target || !(this.target instanceof AbstractLight)) return;

    this._timeAcc += deltaTime;
    this._flickerTimer -= deltaTime;

    // 1. Phase Management: Swap between stable and flickering
    if (this._flickerTimer <= 0) {
      if (
        this._isFlickering &&
        (this.options.maxStableTime > 0 || this.options.minStableTime > 0)
      ) {
        // Go stable
        this._isFlickering = false;
        const range = this.options.maxStableTime - this.options.minStableTime;
        this._flickerTimer = this.options.minStableTime + Math.random() * range;
        this._targetMultiplier = 1.0;
      } else {
        // Go flicker
        this._isFlickering = true;
        const range = this.options.maxFlickerTime - this.options.minFlickerTime;
        this._flickerTimer = this.options.minFlickerTime + Math.random() * range;
      }
    }

    // 2. Determine target multiplier based on the current phase
    if (this._isFlickering) {
      if (this.options.smoothness > 0.0) {
        // Organic flicker (Simplex Noise)
        // Noise returns -1 to 1. Map to [minIntensityMultiplier, 1.0]
        const n = Noise.simplex2(this._timeAcc * 15.0, 0); // Speed factor for noise
        const normalized = (n + 1) / 2; // Map to 0..1
        this._targetMultiplier =
          this.options.minIntensityMultiplier +
          normalized * (1.0 - this.options.minIntensityMultiplier);
      } else {
        // Hard cuts (Electrical)
        // Randomly jump to new targets a few times per second
        if (Math.random() > 0.6) {
          const rand = Math.random();
          if (rand > 0.8) {
            this._targetMultiplier = this.options.minIntensityMultiplier;
          } else if (rand > 0.5) {
            this._targetMultiplier =
              this.options.minIntensityMultiplier +
              Math.random() * (1.0 - this.options.minIntensityMultiplier);
          } else {
            this._targetMultiplier = 1.0;
          }
        }
      }
    } else {
      this._targetMultiplier = 1.0; // Fully on during stable phase
    }

    // 3. Apply smoothness (Lerp)
    if (this.options.smoothness > 0) {
      // A high smoothness means a slower lerp
      const lerpSpeed = 30.0 * (1.0 - this.options.smoothness) + 2.0;
      this._currentMultiplier +=
        (this._targetMultiplier - this._currentMultiplier) * Math.min(deltaTime * lerpSpeed, 1.0);
    } else {
      this._currentMultiplier = this._targetMultiplier; // Instant jump
    }

    // 4. Apply calculated intensity
    this.target.intensity = this.options.baseIntensity * this._currentMultiplier;

    // 5. Apply color shift (if configured)
    if (this._baseColor && this.options.flickerColor) {
      // The lower the multiplier, the closer the color gets to the flickerColor
      const blendFactor = 1.0 - this._currentMultiplier;
      const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

      this.target.color.r = lerp(this._baseColor.r, this.options.flickerColor.r, blendFactor);
      this.target.color.g = lerp(this._baseColor.g, this.options.flickerColor.g, blendFactor);
      this.target.color.b = lerp(this._baseColor.b, this.options.flickerColor.b, blendFactor);
    }
  }
}
