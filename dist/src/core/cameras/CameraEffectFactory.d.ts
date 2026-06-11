import { CameraEffectType } from '../../enums/index.js';
import { CameraEffect } from '../../interfaces/index.js';
/**
 * Factory for creating camera effects.
 */
export declare class CameraEffectFactory {
    /**
     * Creates a new camera effect of the specified type.
     * @param type The type of effect to create.
     * @param intensity The intensity of the effect.
     * @param duration The duration of the effect in seconds.
     * @returns The created camera effect.
     */
    static create(type: CameraEffectType, intensity?: number, duration?: number): CameraEffect;
}
