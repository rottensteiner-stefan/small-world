import { AbstractGeometry } from './AbstractGeometry.js';
export declare class Circle extends AbstractGeometry {
    radius: number;
    segments: number;
    constructor(radius?: number, segments?: number);
    protected generateGeometryData(): void;
}
