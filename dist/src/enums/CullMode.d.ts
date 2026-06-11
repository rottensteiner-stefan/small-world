/**
 * Culling modes for rendering.
 */
export declare const CullMode: {
    /** Cull back faces. */
    readonly BACK: "back";
    /** Cull front faces. */
    readonly FRONT: "front";
    /** No culling. */
    readonly NONE: "none";
};
/** Type definition for CullMode. */
export type CullMode = (typeof CullMode)[keyof typeof CullMode];
