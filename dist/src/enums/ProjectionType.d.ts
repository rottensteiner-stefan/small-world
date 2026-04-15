/**
 * Types of camera projections.
 */
export declare const ProjectionType: {
    /** Oblique projection. */
    readonly OBLIQUE: "ObliqueProjection";
    /** Orthographic projection. */
    readonly ORTHOGRAPHIC: "OrthographicProjection";
    /** Perspective projection. */
    readonly PERSPECTIVE: "PerspectiveProjection";
};
/** Type definition for ProjectionType. */
export type ProjectionType = (typeof ProjectionType)[keyof typeof ProjectionType];
