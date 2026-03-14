/// src/enums/ProjectionType.ts
export const ProjectionType = {
  OBLIQUE: "ObliqueProjection",
  ORTHOGRAPHIC: "OrthographicProjection",
  PERSPECTIVE: "PerspectiveProjection",
} as const;

export type ProjectionType = (typeof ProjectionType)[keyof typeof ProjectionType];
