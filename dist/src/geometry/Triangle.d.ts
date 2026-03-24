import { AbstractGeometry } from './AbstractGeometry.js';
import { Vector3D } from '../math/Vector3D.js';
export declare class Triangle extends AbstractGeometry {
    pointA: Vector3D;
    pointB: Vector3D;
    pointC: Vector3D;
    constructor(pointA: Vector3D, pointB: Vector3D, pointC: Vector3D);
    protected generateGeometryData(): void;
}
