/// src/core/behaviors/OscillatorBehavior.ts
import { Behavior } from "./Behavior.js";
import { OscillatorType } from "../../enums/OscillatorType.js";
import { Noise } from "../../utils/Noise.js";
/**
 * A generalized behavior that encapsulates mathematical oscillation (Sine, Noise, etc.).
 * It does not know *what* it is animating, it only generates a value and calls the `onUpdate` callback.
 */
export class OscillatorBehavior extends Behavior {
    static inspector = {
        type: {
            type: "choice",
            label: "Type",
            options: {
                Sine: OscillatorType.SINE,
                Cosine: OscillatorType.COSINE,
                Noise: OscillatorType.NOISE,
            },
        },
        amplitude: { type: "number", min: 0, max: 20, step: 0.1, label: "Amplitude" },
        frequency: { type: "number", min: 0, max: 50, step: 0.1, label: "Frequency" },
        offset: { type: "number", min: -100, max: 100, step: 0.5, label: "Offset" },
    };
    type;
    amplitude;
    frequency;
    offset;
    onUpdate;
    _time = 0;
    /**
     * Creates a new OscillatorBehavior.
     * @param options Configuration options including the mandatory `onUpdate` callback.
     */
    constructor(options) {
        super();
        this.type = options.type ?? OscillatorType.SINE;
        this.amplitude = options.amplitude ?? 1.0;
        this.frequency = options.frequency ?? 1.0;
        this.offset = options.offset ?? 0.0;
        this.onUpdate = options.onUpdate;
    }
    update(deltaTime) {
        if (!this.target)
            return;
        this._time += deltaTime;
        let val = 0;
        switch (this.type) {
            case OscillatorType.SINE:
                val = Math.sin(this._time * this.frequency) * this.amplitude;
                break;
            case OscillatorType.COSINE:
                val = Math.cos(this._time * this.frequency) * this.amplitude;
                break;
            case OscillatorType.NOISE:
                // Use Simplex Noise for a smooth but unpredictable organic value
                val = Noise.simplex2(this._time * this.frequency, 0) * this.amplitude;
                break;
        }
        // Pass the calculated value back to the user
        this.onUpdate(this.offset + val, deltaTime);
    }
}
//# sourceMappingURL=OscillatorBehavior.js.map