import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for plane geometry.
 */
export interface PlaneOptions {
    /** The width of the plane. Defaults to 1. */
    width?: number;
    /** The depth of the plane. Defaults to 1. */
    depth?: number;
    /** The number of segments along the width. Defaults to 1. */
    widthSegments?: number;
    /** The number of segments along the depth. Defaults to 1. */
    depthSegments?: number;
}
/**
 * A simple plane geometry.
 */
export declare class Plane extends AbstractGeometry {
    /** The width of the plane. */
    width: number;
    /** The depth of the plane. */
    depth: number;
    /** The number of segments along the width. */
    widthSegments: number;
    /** The number of segments along the depth. */
    depthSegments: number;
    /**
     * Creates a new Plane geometry.
     * @param options The configuration options for the plane.
     */
    constructor(options?: PlaneOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
