import { AbstractGeometry } from './AbstractGeometry.js';
export declare class Plane extends AbstractGeometry {
    width: number;
    depth: number;
    widthSegments: number;
    depthSegments: number;
    constructor(width?: number, depth?: number, widthSegments?: number, depthSegments?: number);
    protected generateGeometryData(): void;
}
