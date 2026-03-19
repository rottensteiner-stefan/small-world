/// src/enums/BoundingType.ts
export const BoundingType = {
  BOX: 1,
  SPHERE: 0,
} as const;

export type BoundingType = (typeof BoundingType)[keyof typeof BoundingType];
