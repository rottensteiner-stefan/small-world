import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for disk geometry.
 */
export interface DiskOptions {
    /** The radius of the disk. Defaults to 1. */
    radius?: number;
    /** The number of radial segments. Defaults to 32. */
    segments?: number;
    /** The number of concentric rings. Defaults to 1. */
    rings?: number;
}
/**
 * A disk geometry with concentric rings, providing better tessellation for displacement than a simple Circle.
 */
export declare class Disk extends AbstractGeometry {
    /** The radius of the disk. */
    radius: number;
    /** The number of segments. */
    segments: number;
    /** The number of rings. */
    rings: number;
    /**
     * Creates a new Disk geometry.
     * @param options The configuration options.
     */
    constructor(options?: DiskOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
