import { AbstractGeometry } from './AbstractGeometry.js';
import { Vector3D } from '../math/Vector3D.js';
export declare class Line extends AbstractGeometry {
    start: Vector3D;
    end: Vector3D;
    constructor(start: Vector3D, end: Vector3D);
    protected generateGeometryData(): void;
}
