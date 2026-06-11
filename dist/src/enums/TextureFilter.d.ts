/**
 * Texture filtering modes.
 */
export declare const TextureFilter: {
    /** Linear filtering (smooth). */
    readonly LINEAR: "linear";
    /** Nearest-neighbor filtering (pixelated). */
    readonly NEAREST: "nearest";
    /** Linear filtering with linear mipmap interpolation. */
    readonly LINEAR_MIPMAP_LINEAR: "linear_mipmap_linear";
    /** Linear filtering with nearest mipmap. */
    readonly LINEAR_MIPMAP_NEAREST: "linear_mipmap_nearest";
    /** Nearest filtering with linear mipmap interpolation. */
    readonly NEAREST_MIPMAP_LINEAR: "nearest_mipmap_linear";
    /** Nearest filtering with nearest mipmap. */
    readonly NEAREST_MIPMAP_NEAREST: "nearest_mipmap_nearest";
};
/** Type definition for TextureFilter. */
export type TextureFilter = (typeof TextureFilter)[keyof typeof TextureFilter];
