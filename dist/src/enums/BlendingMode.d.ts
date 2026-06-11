/**
 * Texture blending modes.
 */
export declare const BlendingMode: {
    /** No blending. */
    readonly OPAQUE: "opaque";
    /** Alpha blending. */
    readonly ALPHA: "alpha";
    /** Additive blending. */
    readonly ADDITIVE: "additive";
};
/** Type definition for BlendingMode. */
export type BlendingMode = (typeof BlendingMode)[keyof typeof BlendingMode];
