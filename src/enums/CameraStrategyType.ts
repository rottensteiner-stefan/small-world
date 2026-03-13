export const CameraStrategyType = {
  FIXED: "FixedCamera",
  STIFF: "StiffCamera",
  SMOOTH: "SmoothCamera",
  FPS: "FPSCamera",
} as const;

export type CameraStrategyType = (typeof CameraStrategyType)[keyof typeof CameraStrategyType];
