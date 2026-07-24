import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for grid geometry.
 */
export interface GridOptions {
    /** The total size of the grid edges. Defaults to 20. */
    size?: number;
    /** The number of divisions along each axis. Defaults to 20. */
    divisions?: number;
}
/**
 * A helper geometry representing a flat grid of lines on the XZ plane.
 */
export declare class Grid extends AbstractGeometry {
    /** The total size of the grid. */
    size: number;
    /** The number of divisions. */
    divisions: number;
    /**
     * Creates a new Grid geometry.
     * @param options The configuration options.
     */
    constructor(options?: GridOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
    /**
     * Computes the wireframe indices (line-segments) specifically for Grid.
     */
    computeWireframeIndices(): void;
}
