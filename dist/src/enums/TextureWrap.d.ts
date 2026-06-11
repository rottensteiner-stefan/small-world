/**
 * Texture wrapping modes.
 */
export declare const TextureWrap: {
    /** Repeat the texture. */
    readonly REPEAT: "repeat";
    /** Clamp the texture coordinates to the edge. */
    readonly CLAMP_TO_EDGE: "clamp-to-edge";
    /** Repeat the texture mirrored. */
    readonly MIRRORED_REPEAT: "mirror-repeat";
};
/** Type definition for TextureWrap. */
export type TextureWrap = (typeof TextureWrap)[keyof typeof TextureWrap];
