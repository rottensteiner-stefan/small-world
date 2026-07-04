import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for octahedron geometry.
 */
export interface OctahedronOptions {
    /** The circumradius of the octahedron (distance from center to vertices). Defaults to 1. */
    radius?: number;
}
/**
 * An eight-sided polyhedron (octahedron) geometry.
 */
export declare class Octahedron extends AbstractGeometry {
    /** The circumradius of the octahedron. */
    radius: number;
    /**
     * Creates a new Octahedron geometry.
     * @param options The configuration options.
     */
    constructor(options?: OctahedronOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
    private _addFace;
}
