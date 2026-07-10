/**
 * Types of bounding volumes.
 */
export declare const BoundingType: {
    /** Axis-aligned bounding box. */
    readonly BOX: 1;
    /** Bounding sphere. */
    readonly SPHERE: 0;
    /** Oriented bounding box. */
    readonly OBB: 2;
};
/** Type definition for BoundingType. */
export type BoundingType = (typeof BoundingType)[keyof typeof BoundingType];
