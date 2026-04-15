import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for tube geometry.
 */
export interface TubeOptions {
    /** The outer radius of the tube. Defaults to 1. */
    radius?: number;
    /** The inner radius of the tube. Defaults to 0.5. */
    innerRadius?: number;
    /** The height of the tube. Defaults to 2. */
    height?: number;
    /** The number of radial segments. Defaults to 16. */
    radialSegments?: number;
    /** The number of height segments. Defaults to 1. */
    heightSegments?: number;
}
/**
 * A hollow cylinder geometry (Tube).
 */
export declare class Tube extends AbstractGeometry {
    /** The outer radius. */
    radius: number;
    /** The inner radius. */
    innerRadius: number;
    /** The height. */
    height: number;
    /** The number of radial segments. */
    radialSegments: number;
    /** The number of height segments. */
    heightSegments: number;
    /**
     * Creates a new Tube geometry.
     * @param options The configuration options.
     */
    constructor(options?: TubeOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
