/**
 * Types of bounding volumes.
 */
export declare const BoundingType: {
    /** Axis-aligned bounding box. */
    readonly BOX: 1;
    /** Bounding sphere. */
    readonly SPHERE: 0;
};
/** Type definition for BoundingType. */
export type BoundingType = (typeof BoundingType)[keyof typeof BoundingType];
