export declare const CameraStrategyType: {
    readonly FIXED: "FixedCamera";
    readonly FPS: "FPSCamera";
    readonly SMOOTH: "SmoothCamera";
    readonly STIFF: "StiffCamera";
};
export type CameraStrategyType = (typeof CameraStrategyType)[keyof typeof CameraStrategyType];
