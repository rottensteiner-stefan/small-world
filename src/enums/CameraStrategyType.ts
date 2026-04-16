/// src/enums/CameraStrategyType.ts

export const CameraStrategyType = {
  /** Camera stays fixed at its position. */
  FIXED: "FixedCamera",
  /** First-person shooter camera. */
  FPS: "FPSCamera",
  /** Smooth third-person following camera. */
  SMOOTH: "SmoothCamera",
  /** Rigid third-person following camera. */
  STIFF: "StiffCamera",
  /** Isometric camera. */
  ISOMETRIC: "IsometricCamera",
} as const;

/** Type definition for CameraStrategyType. */
export type CameraStrategyType = (typeof CameraStrategyType)[keyof typeof CameraStrategyType];
