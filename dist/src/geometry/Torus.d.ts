import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for torus geometry.
 */
export interface TorusOptions {
    /** The radius of the torus tube center. Defaults to 1. */
    radius?: number;
    /** The radius of the tube itself. Defaults to 0.4. */
    tube?: number;
    /** The number of radial segments. Defaults to 16. */
    radialSegments?: number;
    /** The number of tubular segments. Defaults to 32. */
    tubularSegments?: number;
}
/**
 * A torus (donut-shaped) geometry.
 */
export declare class Torus extends AbstractGeometry {
    /** The radius of the torus ring. */
    radius: number;
    /** The radius of the tube. */
    tube: number;
    /** The number of radial segments. */
    radialSegments: number;
    /** The number of tubular segments. */
    tubularSegments: number;
    /**
     * Creates a new Torus geometry.
     * @param options The configuration options.
     */
    constructor(options?: TorusOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
    /**
     * Computes the wireframe indices (line-segments) specifically for Torus.
     */
    computeWireframeIndices(): void;
}
