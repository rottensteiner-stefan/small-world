import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for cube geometry.
 */
export interface CubeOptions {
    /** The size of the cube. Defaults to 1. */
    size?: number;
    /** Number of segments along the width. Defaults to 1. */
    widthSegments?: number;
    /** Number of segments along the height. Defaults to 1. */
    heightSegments?: number;
    /** Number of segments along the depth. Defaults to 1. */
    depthSegments?: number;
}
/**
 * A cube geometry with support for subdivisions.
 */
export declare class Cube extends AbstractGeometry {
    /** The size of the cube. */
    size: number;
    /** Number of segments along the width. */
    widthSegments: number;
    /** Number of segments along the height. */
    heightSegments: number;
    /** Number of segments along the depth. */
    depthSegments: number;
    /**
     * Creates a new Cube geometry.
     * @param options The configuration options for the cube.
     */
    constructor(options?: CubeOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
