/// src/enums/TextureFilter.ts
/**
 * Texture filtering modes.
 */
export const TextureFilter = {
  /** Linear filtering (smooth). */
  LINEAR: "linear",
  /** Nearest-neighbor filtering (pixelated). */
  NEAREST: "nearest",
} as const;

/** Type definition for TextureFilter. */
export type TextureFilter = (typeof TextureFilter)[keyof typeof TextureFilter];
