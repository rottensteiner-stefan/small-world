import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * A geometry implementation for externally loaded models (e.g. from OBJ files).
 * Holds raw data provided during construction.
 */
export class ModelGeometry extends AbstractGeometry {
  /**
   * Creates a new ModelGeometry from provided raw data.
   * @param vertices Raw vertex positions.
   * @param uvs Raw texture coordinates.
   * @param normals Raw vertex normals.
   * @param indices Raw triangle indices.
   */
  constructor(
    vertices: number[] | Float32Array,
    uvs: number[] | Float32Array,
    normals: number[] | Float32Array,
    indices: number[] | Uint16Array | Uint32Array,
  ) {
    super();
    this._vertices = vertices instanceof Float32Array ? vertices : new Float32Array(vertices);
    this._uvs = uvs instanceof Float32Array ? uvs : new Float32Array(uvs);
    this._normals = normals instanceof Float32Array ? normals : new Float32Array(normals);

    if (indices instanceof Uint16Array || indices instanceof Uint32Array) {
      this._indices = indices;
    } else {
      this._indices = this._createIndexArray(indices.length);
      this._indices.set(indices);
    }

    // If the model doesn't provide normals, compute them automatically.
    if (0 === this._normals.length) {
      this.computeNormals();
    }
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    // Data is provided in constructor.
  }
}
