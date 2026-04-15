import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for pyramid geometry.
 */
export interface PyramidOptions {
    /** The size of the base. Defaults to 1. */
    base?: number;
    /** The height of the pyramid. Defaults to 1. */
    height?: number;
    /** The number of radial segments (sides). Defaults to 4. */
    radialSegments?: number;
}
/**
 * A pyramid geometry with support for subdivisions.
 */
export declare class Pyramid extends AbstractGeometry {
    /** The size of the base. */
    base: number;
    /** The height of the pyramid. */
    height: number;
    /** The number of radial segments. */
    radialSegments: number;
    /**
     * Creates a new Pyramid geometry.
     * @param options The configuration options for the pyramid.
     */
    constructor(options?: PyramidOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
