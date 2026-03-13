export const RendererType = {
  BEST: "BEST",
  WEB_GPU: "WEB_GPU",
  WEB_GL2: "WEB_GL2",
  WEB_GL1: "WEB_GL1",
  CANVAS: "CANVAS",
} as const;

export type RendererType = (typeof RendererType)[keyof typeof RendererType];
