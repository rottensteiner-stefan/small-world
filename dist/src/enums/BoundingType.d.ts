export declare const BoundingType: {
    readonly BOX: 1;
    readonly SPHERE: 0;
};
export type BoundingType = (typeof BoundingType)[keyof typeof BoundingType];
