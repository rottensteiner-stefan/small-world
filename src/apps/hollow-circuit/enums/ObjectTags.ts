/**
 * Typed tags for identifying Hollow Circuit gameplay objects via `Object3D.tag`,
 * used instead of matching on `Object3D.name` prefixes.
 */
export const ObjectTags = {
  DISC: "disc",
  WISP: "wisp",
  FROSTGLASS: "frostglass",
  EXFIL: "exfil",
} as const;

export type ObjectTag = (typeof ObjectTags)[keyof typeof ObjectTags];
