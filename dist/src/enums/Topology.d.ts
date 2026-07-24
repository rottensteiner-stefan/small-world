/**
 * Primitive topologies for rendering.
 */
export declare const Topology: {
    /** A list of triangles. */
    readonly TRIANGLE_LIST: "triangle-list";
    /** A list of lines. */
    readonly LINE_LIST: "line-list";
    /** A list of points. */
    readonly POINT_LIST: "point-list";
    /** A strip of lines. */
    readonly LINE_STRIP: "line-strip";
};
/** Type definition for Topology. */
export type Topology = (typeof Topology)[keyof typeof Topology];
