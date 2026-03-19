/// src/enums/CameraStrategyType.ts
export const CameraStrategyType = {
  FIXED: "FixedCamera",
  FPS: "FPSCamera",
  SMOOTH: "SmoothCamera",
  STIFF: "StiffCamera",
} as const;

export type CameraStrategyType = (typeof CameraStrategyType)[keyof typeof CameraStrategyType];
