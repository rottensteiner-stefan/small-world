import { AbstractGeometry } from './AbstractGeometry.js';
import { Vector3D } from '../math/Vector3D.js';
/**
 * A triangle geometry.
 */
export declare class Triangle extends AbstractGeometry {
    pointA: Vector3D;
    pointB: Vector3D;
    pointC: Vector3D;
    /**
     * Creates a new Triangle geometry.
     * @param pointA The first point.
     * @param pointB The second point.
     * @param pointC The third point.
     */
    constructor(pointA: Vector3D, pointB: Vector3D, pointC: Vector3D);
    /**
     * @inheritdoc
     */
    protected generateGeometryData(): void;
}
