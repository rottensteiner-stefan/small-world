/// src/enums/EventType.ts
export const EventType = {
  LOADER_END: "LoaderEnd",
  LOADER_ERROR: "LoaderError",
  LOADER_PROGRESS: "LoaderProgress",
  LOADER_START: "LoaderStart",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];
