import { AbstractGeometry } from './AbstractGeometry.js';
export declare class Pyramid extends AbstractGeometry {
    base: number;
    height: number;
    constructor(base?: number, height?: number);
    protected generateGeometryData(): void;
}
