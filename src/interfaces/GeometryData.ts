/// src/interfaces/GeometryData.ts

/**
 * Interface representing raw geometry data for GPU upload and rendering.
 * All numeric data is stored in TypedArrays for maximum performance.
 */
import { BoundingVolume } from "./BoundingVolume.js";
import { Topology } from "../enums/index.js";

export interface GeometryDataInterface {
  /** Vertex position data (x, y, z). Mandatory. */
  vertices: Float32Array;
  /** Optional index data. If provided, indexed rendering is used. */
  indices?: Uint16Array | Uint32Array | undefined;
  /** Optional index data for wireframe rendering. */
  wireframeIndices?: Uint16Array | Uint32Array | undefined;
  /** Optional normal data (nx, ny, nz). */
  normals?: Float32Array | undefined;
  /** Optional tangent data (tx, ty, tz). Used for normal mapping. */
  tangents?: Float32Array | undefined;
  /** Optional texture coordinate data (u, v). */
  uvs?: Float32Array | undefined;
  /** The topology of the geometry (e.g., TRIANGLE_LIST or LINE_LIST). */
  topology?: Topology;
  /**
   * Flag to indicate that the vertex/normal/tangent buffers need to be re-uploaded to the GPU.
   * Set this to true after modifying the TypedArrays in-place.
   */
  needsUpdate?: boolean;
  getBoundingVolume(): BoundingVolume;
}
