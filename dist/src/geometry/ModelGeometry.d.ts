import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * A geometry loaded from a model file.
 */
export declare class ModelGeometry extends AbstractGeometry {
    /**
     * Creates a new ModelGeometry.
     * @param vertices The vertices.
     * @param uvs The UV coordinates.
     * @param normals The normals.
     * @param indices The indices.
     */
    constructor(vertices: number[], uvs: number[], normals: number[], indices: number[]);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}
