/// src/interfaces/GeometryData.ts

/**
 * Interface representing raw geometry data for rendering.
 */
export interface GeometryDataInterface {
  /** Vertex position data (x, y, z). */
  vertices: Float32Array;
  /** Optional index data. If provided, indexed rendering is used. */
  indices?: Uint16Array | Uint32Array | undefined;
  /** Optional index data for wireframe rendering. */
  wireframeIndices?: Uint16Array | Uint32Array | undefined;
  /** Optional normal data (nx, ny, nz). */
  normals?: Float32Array | undefined;
  /** Optional tangent data (tx, ty, tz). */
  tangents?: Float32Array | undefined;
  /** Optional texture coordinate data (u, v). */
  uvs?: Float32Array | undefined;
  /** Flag to indicate that the vertex/normal buffers need to be re-uploaded to the GPU. */
  needsUpdate?: boolean;
}
