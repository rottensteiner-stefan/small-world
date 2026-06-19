/// src/core/behaviors/PulsatingBehavior.ts
import { Behavior } from "./Behavior.js";
/**
 * A generic behavior that generates a pulsating value (sine wave) over time
 * and applies it via a callback function.
 */
export class PulsatingBehavior extends Behavior {
    min;
    max;
    minDuration;
    maxDuration;
    onUpdate;
    _time = 0;
    _currentDuration = 0;
    _randomOffset = 0;
    /**
     * Creates a new PulsatingBehavior.
     * @param options Configuration options.
     */
    constructor(options) {
        super();
        this.min = options.min ?? 0.0;
        this.max = options.max ?? 1.0;
        this.minDuration = options.minDuration ?? 2.0;
        this.maxDuration = options.maxDuration ?? 5.0;
        this.onUpdate = options.onUpdate;
        // Pick a random duration within the range for this specific instance
        this._currentDuration =
            this.minDuration + Math.random() * (this.maxDuration - this.minDuration);
        // Add a random time offset so multiple instances don't pulse synchronously
        this._randomOffset = Math.random() * Math.PI * 2;
    }
    update(deltaTime) {
        if (!this.target)
            return;
        this._time += deltaTime;
        // Calculate phase based on the current duration, including the random offset
        const phase = (this._time / this._currentDuration) * Math.PI * 2 + this._randomOffset;
        // Sine wave from -1 to 1
        const sineVal = Math.sin(phase);
        // Map -1..1 to 0..1
        const normalized = (sineVal + 1.0) * 0.5;
        // Map to min..max
        const finalValue = this.min + normalized * (this.max - this.min);
        // Pass the value to the callback
        this.onUpdate(finalValue, this.target);
    }
}
//# sourceMappingURL=PulsatingBehavior.js.map