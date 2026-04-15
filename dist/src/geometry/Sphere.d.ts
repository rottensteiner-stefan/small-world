import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for sphere geometry.
 */
export interface SphereOptions {
    /** The radius of the sphere. Defaults to 1. */
    radius?: number;
    /** The number of horizontal segments. Defaults to 16. */
    widthSegments?: number;
    /** The number of vertical segments. Defaults to 12. */
    heightSegments?: number;
}
/**
 * A sphere geometry.
 */
export declare class Sphere extends AbstractGeometry {
    /** The radius of the sphere. */
    radius: number;
    /** The number of horizontal segments. */
    widthSegments: number;
    /** The number of vertical segments. */
    heightSegments: number;
    /**
     * Creates a new Sphere geometry.
     * @param options The configuration options for the sphere.
     */
    constructor(options?: SphereOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
