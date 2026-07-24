import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration for the Plane geometry.
 */
export interface PlaneOptions {
    /** Width of the plane (along the X axis). Defaults to 1. */
    width?: number;
    /** Height of the plane (along the Y axis). Defaults to 1. */
    height?: number;
    /** Number of segments along the width. Defaults to 1. */
    widthSegments?: number;
    /** Number of segments along the height. Defaults to 1. */
    heightSegments?: number;
}
/**
 * A vertical flat plane geometry on the X-Y plane, facing +Z.
 * Useful for UI, Sprites, Billboards, and walls.
 */
export declare class Plane extends AbstractGeometry {
    /** The width of the plane. */
    width: number;
    /** The height of the plane. */
    height: number;
    /** The number of segments along the width. */
    widthSegments: number;
    /** The number of segments along the height. */
    heightSegments: number;
    /**
     * Creates a new Plane geometry.
     * @param options The configuration options.
     */
    constructor(options?: PlaneOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
    /**
     * Computes the wireframe indices (line-segments) specifically for Plane.
     */
    computeWireframeIndices(): void;
}
