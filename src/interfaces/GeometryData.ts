/// src/interfaces/GeometryData.ts
export interface GeometryData {
  vertices: Float32Array;
  indices: Uint16Array | Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
}
