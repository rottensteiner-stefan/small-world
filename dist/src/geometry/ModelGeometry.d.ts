import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * A geometry implementation for externally loaded models (e.g. from OBJ files).
 * Holds raw data provided during construction.
 */
export declare class ModelGeometry extends AbstractGeometry {
    /**
     * Creates a new ModelGeometry from provided raw data.
     * @param vertices Raw vertex positions.
     * @param uvs Raw texture coordinates.
     * @param normals Raw vertex normals.
     * @param indices Raw triangle indices.
     */
    constructor(vertices: number[], uvs: number[], normals: number[], indices: number[]);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
