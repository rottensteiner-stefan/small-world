/**
 * Typed tags for identifying Hollow Circuit gameplay objects via `Object3D.tag`,
 * used instead of matching on `Object3D.name` prefixes.
 */
export const HollowCircuitObjectTags = {
  DISC: "disc",
  WISP: "wisp",
  FROSTGLASS: "frostglass",
} as const;

export type HollowCircuitObjectTag =
  (typeof HollowCircuitObjectTags)[keyof typeof HollowCircuitObjectTags];
