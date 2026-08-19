export const ObjectTags = {
  DISC: "dw:disc",
  ENEMY: "dw:enemy",
  WALL: "dw:wall",
  FLOOR: "dw:floor",
  PICKUP: "dw:pickup",
  PLAYER: "dw:player",
} as const;

export type ObjectTag = (typeof ObjectTags)[keyof typeof ObjectTags];
