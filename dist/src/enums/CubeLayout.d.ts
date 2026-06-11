/**
 * Layouts for cube map textures.
 */
export declare const CubeLayout: {
    /** Six individual images. */
    readonly SIX_IMAGES: "six_images";
    /** 6x1 horizontal strip. */
    readonly STRIP_HORIZONTAL: "strip_horizontal";
    /** 1x6 vertical strip. */
    readonly STRIP_VERTICAL: "strip_vertical";
    /** 3x2 grid. */
    readonly GRID_3X2: "grid_3x2";
    /** 4x3 horizontal cross. */
    readonly CROSS_HORIZONTAL: "cross_horizontal";
    /** 3x4 vertical cross. */
    readonly CROSS_VERTICAL: "cross_vertical";
};
/** Type definition for CubeLayout. */
export type CubeLayout = (typeof CubeLayout)[keyof typeof CubeLayout];
