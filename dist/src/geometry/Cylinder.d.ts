import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for cylinder geometry.
 */
export interface CylinderOptions {
    /** The radius at the top. Defaults to 1. Set to 0 for a cone. */
    radiusTop?: number;
    /** The radius at the bottom. Defaults to 1. */
    radiusBottom?: number;
    /** The total height of the cylinder. Defaults to 2. */
    height?: number;
    /** The number of radial segments around the circumference. Defaults to 16. */
    radialSegments?: number;
    /** The number of height segments along the vertical axis. Defaults to 1. */
    heightSegments?: number;
    /** The start angle of the sector in radians. Defaults to 0. */
    thetaStart?: number;
    /** The central angle of the sector in radians. Defaults to 2 * PI (full cylinder). */
    thetaLength?: number;
}
/**
 * A generalized cylinder geometry.
 * Can represent standard cylinders, cones (top radius 0), and conical frustums.
 * Supports partial sectors (pie slices) via thetaStart and thetaLength.
 */
export declare class Cylinder extends AbstractGeometry {
    /** The radius at the top. */
    radiusTop: number;
    /** The radius at the bottom. */
    radiusBottom: number;
    /** The total height. */
    height: number;
    /** The number of radial segments. */
    radialSegments: number;
    /** The number of height segments. */
    heightSegments: number;
    /** The start angle in radians. */
    thetaStart: number;
    /** The central angle in radians. */
    thetaLength: number;
    /**
     * Creates a new Cylinder geometry.
     * @param options The configuration options.
     */
    constructor(options?: CylinderOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
