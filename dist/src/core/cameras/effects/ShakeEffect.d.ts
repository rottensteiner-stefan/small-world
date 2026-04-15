import { AbstractCameraEffect } from './AbstractCameraEffect.js';
import { CameraEffectType } from '../../../enums/index.js';
/**
 * A screen shake effect for the camera.
 */
export declare class ShakeEffect extends AbstractCameraEffect {
    /** @inheritdoc */
    readonly type: CameraEffectType;
    private _intensity;
    private _duration;
    private _elapsed;
    /**
     * Creates a new ShakeEffect.
     * @param intensity The maximum intensity of the shake.
     * @param duration The duration of the shake in seconds.
     */
    constructor(intensity?: number, duration?: number);
    /** @inheritdoc */
    update(deltaTime: number): void;
}
