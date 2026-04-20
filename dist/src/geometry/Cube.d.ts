import { AbstractGeometry } from './AbstractGeometry.js';
import { BoundingVolume } from '../interfaces/index.js';
/**
 * Configuration options for cube geometry.
 */
export interface CubeOptions {
    /** The size of the cube edges. Defaults to 1. */
    size?: number;
    /** Number of segments along the width (X-axis). Defaults to 1. */
    widthSegments?: number;
    /** Number of segments along the height (Y-axis). Defaults to 1. */
    heightSegments?: number;
    /** Number of segments along the depth (Z-axis). Defaults to 1. */
    depthSegments?: number;
}
/**
 * A box-shaped geometry with support for face subdivisions.
 */
export declare class Cube extends AbstractGeometry {
    /** The size of the cube edges. */
    size: number;
    /** Number of segments along the width. */
    widthSegments: number;
    /** Number of segments along the height. */
    heightSegments: number;
    /** Number of segments along the depth. */
    depthSegments: number;
    /**
     * Creates a new Cube geometry.
     * @param options The configuration options.
     */
    constructor(options?: CubeOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
    /** @inheritdoc */
    getBoundingVolume(): BoundingVolume;
}
