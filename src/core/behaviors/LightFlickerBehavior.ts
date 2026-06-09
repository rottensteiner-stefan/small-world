/// src/core/behaviors/LightFlickerBehavior.ts

import { Behavior } from "./Behavior.js";
import { AbstractLight } from "../lights/AbstractLight.js";
import { Object3D } from "../Object3D.js";

export class LightFlickerBehavior extends Behavior {
  public baseIntensity: number = 1.0;
  
  private _flickerTimer: number = 2.0;
  private _isFlickering: boolean = false;
  private _flickerMultiplier: number = 1.0;

  constructor(baseIntensity: number = 1.0) {
    super();
    this.baseIntensity = baseIntensity;
  }

  public override update(deltaTime: number): void {
    if (!this.target || !(this.target instanceof AbstractLight)) return;

    this._flickerTimer -= deltaTime;

    if (this._flickerTimer <= 0) {
      if (this._isFlickering) {
        // Stop flickering, stay stable for 2 to 6 seconds
        this._isFlickering = false;
        this._flickerTimer = 2.0 + Math.random() * 4.0;
        this._flickerMultiplier = 1.0;
      } else {
        // Start flickering for 0.2 to 1.5 seconds
        this._isFlickering = true;
        this._flickerTimer = 0.2 + Math.random() * 1.3;
      }
    }

    if (this._isFlickering) {
      // Unpredictable rapid changes during flicker phase
      const rand = Math.random();
      if (rand > 0.8) {
        // 20% chance to drop significantly (almost off)
        this._flickerMultiplier = Math.random() * 0.2;
      } else if (rand > 0.5) {
        // 30% chance to flutter at medium brightness
        this._flickerMultiplier = 0.4 + Math.random() * 0.4;
      } else {
        // 50% chance to be at full intensity during a flicker phase
        this._flickerMultiplier = 1.0;
      }
    } else {
      this._flickerMultiplier = 1.0;
    }

    // Apply the multiplier
    this.target.intensity = this.baseIntensity * this._flickerMultiplier;
  }
}
