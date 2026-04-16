import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for circle geometry.
 */
export interface CircleOptions {
    /** The radius of the circle. Defaults to 1. */
    radius?: number;
    /** The number of radial segments. Defaults to 32. */
    segments?: number;
    /** The start angle of the circle segment in radians. Defaults to 0. */
    thetaStart?: number;
    /** The central angle of the circle segment in radians. Defaults to 2 * PI. */
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
    /** The start angle in radians. */
    thetaStart: number;
    /** The central angle in radians. */
    thetaLength: number;
    /**
     * Creates a new Circle geometry.
     * @param options The configuration options.
     */
    constructor(options?: CircleOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
