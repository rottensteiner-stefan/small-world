import { AbstractGeometry } from './AbstractGeometry.js';
export declare class Grid extends AbstractGeometry {
    size: number;
    divisions: number;
    constructor(size?: number, divisions?: number);
    protected generateGeometryData(): void;
}
