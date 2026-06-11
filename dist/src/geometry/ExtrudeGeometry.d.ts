import { AbstractGeometry } from './AbstractGeometry.js';
import { Vector2D } from '../math/index.js';
/**
 * Options for ExtrudeGeometry.
 */
export interface ExtrudeGeometryOptions {
    /** The 2D shape defined by a sequence of points. Must form a closed contour around the origin (0,0). */
    shape: Vector2D[];
    /** Optional inner shape to create a hole. Must have the same number of points as shape. */
    innerShape?: Vector2D[];
    /** The depth/thickness to extrude along the Z-axis. Defaults to 1. */
    depth?: number;
}
/**
 * Geometry created by extruding a star-shaped 2D polygon along the Z-axis.
 */
export declare class ExtrudeGeometry extends AbstractGeometry {
    readonly shape: Vector2D[];
    readonly innerShape: Vector2D[] | undefined;
    readonly depth: number;
    constructor(options: ExtrudeGeometryOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
