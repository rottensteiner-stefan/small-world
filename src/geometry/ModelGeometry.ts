import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * Options for configuring skinning data on a ModelGeometry.
 */
export interface ModelGeometryOptions {
  /** Skinning joint indices (4 IDs per vertex). */
  joints?: number[] | Float32Array | Uint16Array | undefined;
  /** Skinning joint weights (4 weights per vertex). */
  weights?: number[] | Float32Array | undefined;
}

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
   * @param options Optional configuration including skinning joints and weights.
   */
  constructor(
    vertices: number[] | Float32Array,
    uvs: number[] | Float32Array,
    normals: number[] | Float32Array,
    indices: number[] | Uint16Array | Uint32Array,
    options: ModelGeometryOptions = {},
  ) {
    super();
    this._vertices = vertices instanceof Float32Array ? vertices : new Float32Array(vertices);
    this._uvs = uvs instanceof Float32Array ? uvs : new Float32Array(uvs);
    this._normals = normals instanceof Float32Array ? normals : new Float32Array(normals);

    if (options?.joints) {
      this._joints =
        options.joints instanceof Float32Array ? options.joints : new Float32Array(options.joints);
    }
    if (options?.weights) {
      this._weights =
        options.weights instanceof Float32Array
          ? options.weights
          : new Float32Array(options.weights);
    }

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
