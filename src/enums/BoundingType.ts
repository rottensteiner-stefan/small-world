/// src/enums/BoundingType.ts

export const BoundingType = {
  /** Axis-aligned bounding box. */
  BOX: 1,
  /** Bounding sphere. */
  SPHERE: 0,
} as const;

/** Type definition for BoundingType. */
export type BoundingType = (typeof BoundingType)[keyof typeof BoundingType];
