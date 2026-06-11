import { AbstractGeometry } from './AbstractGeometry.js';
import { Vector3D } from '../math/Vector3D.js';
/**
 * A simple line geometry connecting two points.
 */
export declare class Line extends AbstractGeometry {
    start: Vector3D;
    end: Vector3D;
    /**
     * Creates a new Line geometry.
     * @param start The start position of the line.
     * @param end The end position of the line.
     */
    constructor(start: Vector3D, end: Vector3D);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
