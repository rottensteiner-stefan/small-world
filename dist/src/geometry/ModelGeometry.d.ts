import { AbstractGeometry } from './AbstractGeometry.js';
export declare class ModelGeometry extends AbstractGeometry {
    constructor(vertices: number[], uvs: number[], normals: number[], indices: number[]);
    protected generateGeometryData(): void;
}
