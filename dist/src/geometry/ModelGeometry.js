/// src/geometry/ModelGeometry.ts
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
    constructor(vertices, uvs, normals, indices) {
        super();
        this._vertices = new Float32Array(vertices);
        this._uvs = new Float32Array(uvs);
        this._normals = new Float32Array(normals);
        this._indices = this._createIndexArray(indices.length);
        this._indices.set(indices);
        // If the model doesn't provide normals, compute them automatically.
        if (0 === this._normals.length) {
            this.computeNormals();
        }
    }
    /** @inheritdoc */
    generateGeometryData() {
        // Data is provided in constructor.
    }
}
//# sourceMappingURL=ModelGeometry.js.map