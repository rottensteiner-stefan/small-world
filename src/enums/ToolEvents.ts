export const ToolEvents = {
  Pixler: {
    LOAD_BASE64: "tool:pixler:loadBase64",
    IMAGE_SAVED: "tool:pixler:imageSaved",
  },
  IXtractor: {
    EXTRACTED: "tool:ixtractor:extracted",
  },
} as const;

export type ToolEvents = typeof ToolEvents;
