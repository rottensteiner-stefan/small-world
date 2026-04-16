/// src/enums/ProjectionType.ts

/**
 * Types of camera projections.
 */
export const ProjectionType = {
  /** Oblique projection. */
  OBLIQUE: "ObliqueProjection",
  /** Orthographic projection. */
  ORTHOGRAPHIC: "OrthographicProjection",
  /** Perspective projection. */
  PERSPECTIVE: "PerspectiveProjection",
} as const;

/** Type definition for ProjectionType. */
export type ProjectionType = (typeof ProjectionType)[keyof typeof ProjectionType];
