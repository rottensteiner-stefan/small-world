import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for pyramid geometry.
 */
export interface PyramidOptions {
    /** The size of the square base. Defaults to 1. */
    base?: number;
    /** The total height of the pyramid. Defaults to 1. */
    height?: number;
    /** The number of radial segments (faces). Defaults to 4 for a square pyramid. */
    radialSegments?: number;
}
/**
 * A pyramid geometry with a flat base and a tip.
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
     * @param options The configuration options.
     */
    constructor(options?: PyramidOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
