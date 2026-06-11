import { AbstractGeometry } from './AbstractGeometry.js';
import { Vector3D } from '../math/Vector3D.js';
/**
 * A simple triangle geometry defined by three points.
 */
export declare class Triangle extends AbstractGeometry {
    pointA: Vector3D;
    pointB: Vector3D;
    pointC: Vector3D;
    /**
     * Creates a new Triangle geometry.
     * @param pointA The first vertex position.
     * @param pointB The second vertex position.
     * @param pointC The third vertex position.
     */
    constructor(pointA: Vector3D, pointB: Vector3D, pointC: Vector3D);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
