/**
 * Primitive topologies for rendering.
 */
export declare const Topology: {
    /** A list of triangles. */
    readonly TRIANGLE_LIST: "triangle-list";
    /** A list of lines. */
    readonly LINE_LIST: "line-list";
};
/** Type definition for Topology. */
export type Topology = (typeof Topology)[keyof typeof Topology];
