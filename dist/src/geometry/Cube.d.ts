import { AbstractGeometry } from './AbstractGeometry.js';
export declare class Cube extends AbstractGeometry {
    size: number;
    constructor(size?: number);
    protected generateGeometryData(): void;
}
