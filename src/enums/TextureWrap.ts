/**
 * Texture wrapping modes.
 */
export const TextureWrap = {
  /** Repeat the texture. */
  REPEAT: "repeat",
  /** Clamp the texture coordinates to the edge. */
  CLAMP_TO_EDGE: "clamp-to-edge",
  /** Repeat the texture mirrored. */
  MIRRORED_REPEAT: "mirror-repeat",
} as const;

/** Type definition for TextureWrap. */
export type TextureWrap = (typeof TextureWrap)[keyof typeof TextureWrap];
