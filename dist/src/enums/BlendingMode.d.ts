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
    /** Premultiplied alpha blending (useful for glass where specular highlights remain opaque). */
    readonly PREMULTIPLIED_ALPHA: "premultiplied_alpha";
};
/** Type definition for BlendingMode. */
export type BlendingMode = (typeof BlendingMode)[keyof typeof BlendingMode];
