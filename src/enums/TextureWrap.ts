export const TextureWrap = {
  REPEAT: "repeat",
  CLAMP_TO_EDGE: "clamp-to-edge",
  MIRRORED_REPEAT: "mirror-repeat",
} as const;

export type TextureWrap = (typeof TextureWrap)[keyof typeof TextureWrap];
