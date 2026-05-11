/// src/enums/Topology.ts

/**
 * Primitive topologies for rendering.
 */
export const Topology = {
  /** A list of triangles. */
  TRIANGLE_LIST: "triangle-list",
  /** A list of lines. */
  LINE_LIST: "line-list",
} as const;

/** Type definition for Topology. */
export type Topology = (typeof Topology)[keyof typeof Topology];
