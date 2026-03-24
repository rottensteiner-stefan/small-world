import { AbstractGeometry } from './AbstractGeometry.js';
export declare class Cylinder extends AbstractGeometry {
    radius: number;
    height: number;
    segments: number;
    constructor(radius?: number, height?: number, segments?: number);
    protected generateGeometryData(): void;
}
