/**
 * Types of camera control strategies.
 */
export declare const CameraStrategyType: {
    /** Camera stays fixed at its position. */
    readonly FIXED: "FixedCamera";
    /** First-person shooter camera. */
    readonly FPS: "FPSCamera";
    /** Smooth third-person following camera. */
    readonly SMOOTH: "SmoothCamera";
    /** Rigid third-person following camera. */
    readonly STIFF: "StiffCamera";
    /** Isometric camera. */
    readonly ISOMETRIC: "IsometricCamera";
};
/** Type definition for CameraStrategyType. */
export type CameraStrategyType = (typeof CameraStrategyType)[keyof typeof CameraStrategyType];
