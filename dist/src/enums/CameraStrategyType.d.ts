/**
 * Types of camera control strategies.
 */
export declare const CameraStrategyType: {
    /** Developer has full manual control over position and target. No automation. */
    readonly MANUAL: "ManualCamera";
    /** Hybrid strategy that syncs manual position changes with orbital coordinates. */
    readonly HYBRID_SYNC: "HybridSyncCamera";
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
