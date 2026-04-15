import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for circle geometry.
 */
export interface CircleOptions {
    /** The radius of the circle. Defaults to 1. */
    radius?: number;
    /** The number of segments. Defaults to 32. */
    segments?: number;
    /** The start angle of the circle segment in radians. Defaults to 0. */
    thetaStart?: number;
    /** The central angle of the circle segment in radians. Defaults to 2 * Math.PI (full circle). */
    thetaLength?: number;
}
/**
 * A simple circle geometry, optionally as a segment or sector.
 */
export declare class Circle extends AbstractGeometry {
    /** The radius of the circle. */
    radius: number;
    /** The number of segments. */
    segments: number;
    /** The start angle of the circle segment in radians. */
    thetaStart: number;
    /** The central angle of the circle segment in radians. */
    thetaLength: number;
    /**
     * Creates a new Circle geometry.
     * @param options The configuration options for the circle.
     */
    constructor(options?: CircleOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
