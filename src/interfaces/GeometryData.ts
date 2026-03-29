/// src/interfaces/GeometryData.ts

/**
 * Interface representing raw geometry data.
 */
export interface GeometryDataInterface {
  /** Vertex position data. */
  vertices: Float32Array;
  /** Index data. */
  indices: Uint16Array | Uint32Array;
  /** Optional normal data. */
  normals: Float32Array;
  /** Optional texture coordinate data. */
  uvs: Float32Array;
}
