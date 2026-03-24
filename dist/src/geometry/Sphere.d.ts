import { AbstractGeometry } from './AbstractGeometry.js';
export declare class Sphere extends AbstractGeometry {
    radius: number;
    widthSegments: number;
    heightSegments: number;
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
    protected generateGeometryData(): void;
}
