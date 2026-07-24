import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration for the Ground geometry.
 */
export interface GroundOptions {
    /** Width of the ground (along the X axis). Defaults to 1. */
    width?: number;
    /** Depth of the ground (along the Z axis). Defaults to 1. */
    depth?: number;
    /** Number of segments along the width. Defaults to 1. */
    widthSegments?: number;
    /** Number of segments along the depth. Defaults to 1. */
    depthSegments?: number;
}
/**
 * A horizontal Ground geometry on the X-Z plane.
 * Useful for terrains, floors, and basic rectangular flat surfaces.
 */
export declare class Ground extends AbstractGeometry {
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
    constructor(options?: GroundOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
    /**
     * Computes the wireframe indices (line-segments) specifically for Ground.
     */
    computeWireframeIndices(): void;
}
