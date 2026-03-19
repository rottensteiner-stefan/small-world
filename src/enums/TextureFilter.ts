/// src/enums/TextureFilter.ts
export const TextureFilter = {
  LINEAR: "linear",
  NEAREST: "nearest",
} as const;

export type TextureFilter = (typeof TextureFilter)[keyof typeof TextureFilter];
