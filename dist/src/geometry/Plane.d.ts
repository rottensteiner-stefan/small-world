import { AbstractGeometry } from './AbstractGeometry.js';
import { BoundingVolume } from '../interfaces/index.js';
/**
 * Configuration options for plane geometry.
 */
export interface PlaneOptions {
    /** The total width of the plane. Defaults to 1. */
    width?: number;
    /** The total depth of the plane. Defaults to 1. */
    depth?: number;
    /** The number of segments along the width (subdivisions). Defaults to 1. */
    widthSegments?: number;
    /** The number of segments along the depth (subdivisions). Defaults to 1. */
    depthSegments?: number;
}
/**
 * A simple flat plane geometry on the XZ plane.
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
     * @param options The configuration options.
     */
    constructor(options?: PlaneOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
    /** @inheritdoc */
    getBoundingVolume(): BoundingVolume;
}
