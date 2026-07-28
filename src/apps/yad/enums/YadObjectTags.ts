/**
 * Typed tags for identifying Yad gameplay objects via `Object3D.tag`,
 * used instead of matching on `Object3D.name` prefixes.
 */
export const YadObjectTags = {
  ENEMY: "enemy",
  DEAD_ENEMY: "deadEnemy",
  ITEM: "item",
  DOOR: "door",
  LAVA: "lava",
  SLIME: "slime",
} as const;

export type YadObjectTag = (typeof YadObjectTags)[keyof typeof YadObjectTags];
