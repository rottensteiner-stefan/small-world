/// src/interfaces/GeometryDataInterface.ts
export interface GeometryDataInterface {
  vertices: Float32Array;
  indices: Uint16Array | Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
}
