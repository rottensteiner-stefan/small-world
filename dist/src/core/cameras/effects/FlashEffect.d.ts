import { AbstractCameraEffect } from './AbstractCameraEffect.js';
import { CameraEffectType } from '../../../enums/index.js';
/**
 * A flash effect for the camera (simulated via target offset or potentially other means).
 * Note: A real flash might need renderer support, but here we can simulate a 'jolt'.
 */
export declare class FlashEffect extends AbstractCameraEffect {
    /** @inheritdoc */
    readonly type: CameraEffectType;
    private _intensity;
    private _duration;
    private _elapsed;
    /**
     * Creates a new FlashEffect.
     * @param intensity The intensity of the flash.
     * @param duration The duration of the flash in seconds.
     */
    constructor(intensity?: number, duration?: number);
    /** @inheritdoc */
    update(deltaTime: number): void;
}
