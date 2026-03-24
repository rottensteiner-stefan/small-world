export declare const ProjectionType: {
    readonly OBLIQUE: "ObliqueProjection";
    readonly ORTHOGRAPHIC: "OrthographicProjection";
    readonly PERSPECTIVE: "PerspectiveProjection";
};
export type ProjectionType = (typeof ProjectionType)[keyof typeof ProjectionType];
