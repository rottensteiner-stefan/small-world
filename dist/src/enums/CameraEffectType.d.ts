/**
 * Types of camera effects.
 */
export declare const CameraEffectType: {
    /** Screen shake effect. */
    readonly SHAKE: "ShakeEffect";
    /** Screen flash effect. */
    readonly FLASH: "FlashEffect";
};
/** Type definition for CameraEffectType. */
export type CameraEffectType = (typeof CameraEffectType)[keyof typeof CameraEffectType];
