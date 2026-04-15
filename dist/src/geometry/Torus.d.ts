import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for torus geometry.
 */
export interface TorusOptions {
    /** The radius of the torus. Defaults to 1. */
    radius?: number;
    /** The radius of the tube. Defaults to 0.4. */
    tube?: number;
    /** The number of radial segments. Defaults to 16. */
    radialSegments?: number;
    /** The number of tubular segments. Defaults to 32. */
    tubularSegments?: number;
}
/**
 * A torus geometry.
 */
export declare class Torus extends AbstractGeometry {
    /** The radius of the torus. */
    radius: number;
    /** The radius of the tube. */
    tube: number;
    /** The number of radial segments. */
    radialSegments: number;
    /** The number of tubular segments. */
    tubularSegments: number;
    /**
     * Creates a new Torus geometry.
     * @param options The configuration options for the torus.
     */
    constructor(options?: TorusOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
