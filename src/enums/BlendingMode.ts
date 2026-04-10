/// src/enums/BlendingMode.ts

/**
 * Texture blending modes.
 */
export const BlendingMode = {
  /** No blending. */
  OPAQUE: "opaque",
  /** Alpha blending. */
  ALPHA: "alpha",
  /** Additive blending. */
  ADDITIVE: "additive",
} as const;

/** Type definition for BlendingMode. */
export type BlendingMode = (typeof BlendingMode)[keyof typeof BlendingMode];
