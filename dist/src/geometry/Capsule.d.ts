import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for capsule geometry.
 */
export interface CapsuleOptions {
    /** The radius of the capsule. Defaults to 0.5. */
    radius?: number;
    /** The length of the cylinder part. Defaults to 1. */
    length?: number;
    /** The number of radial segments. Defaults to 16. */
    radialSegments?: number;
    /** The number of height segments for the caps. Defaults to 8. */
    capSegments?: number;
}
/**
 * A capsule geometry consisting of a cylinder with hemispherical caps.
 */
export declare class Capsule extends AbstractGeometry {
    /** The radius of the capsule. */
    radius: number;
    /** The length of the cylinder part. */
    length: number;
    /** The number of radial segments. */
    radialSegments: number;
    /** The number of segments for the caps. */
    capSegments: number;
    /**
     * Creates a new Capsule geometry.
     * @param options The configuration options.
     */
    constructor(options?: CapsuleOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
