import { AbstractGeometry } from './AbstractGeometry.js';
export declare class Torus extends AbstractGeometry {
    radius: number;
    tube: number;
    radialSegments: number;
    tubularSegments: number;
    constructor(radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number);
    protected generateGeometryData(): void;
}
