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
  /** Premultiplied alpha blending (useful for glass where specular highlights remain opaque). */
  PREMULTIPLIED_ALPHA: "premultiplied_alpha",
} as const;

/** Type definition for BlendingMode. */
export type BlendingMode = (typeof BlendingMode)[keyof typeof BlendingMode];
