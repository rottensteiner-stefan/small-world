/// src/core/cameras/effects/ShakeEffect.ts
import { AbstractCameraEffect } from "./AbstractCameraEffect.js";
import { CameraEffectType } from "../../../enums/index.js";
/**
 * A screen shake effect for the camera.
 */
export class ShakeEffect extends AbstractCameraEffect {
    /** @inheritdoc */
    type = CameraEffectType.SHAKE;
    _intensity;
    _duration;
    _elapsed = 0;
    /**
     * Creates a new ShakeEffect.
     * @param intensity The maximum intensity of the shake.
     * @param duration The duration of the shake in seconds.
     */
    constructor(intensity = 0.5, duration = 0.5) {
        super();
        this._intensity = intensity;
        this._duration = duration;
    }
    /** @inheritdoc */
    update(deltaTime) {
        this._elapsed += deltaTime;
        if (this._elapsed >= this._duration) {
            this.isFinished = true;
            this.offset.set(0, 0, 0);
            return;
        }
        const remaining = 1.0 - this._elapsed / this._duration;
        const currentIntensity = this._intensity * remaining;
        this.offset.x = (Math.random() * 2 - 1) * currentIntensity;
        this.offset.y = (Math.random() * 2 - 1) * currentIntensity;
        this.offset.z = (Math.random() * 2 - 1) * currentIntensity;
    }
}
//# sourceMappingURL=ShakeEffect.js.map