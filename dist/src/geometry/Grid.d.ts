import { AbstractGeometry } from './AbstractGeometry.js';
/**
 * Configuration options for grid geometry.
 */
export interface GridOptions {
    /** The total size of the grid. Defaults to 20. */
    size?: number;
    /** The number of divisions. Defaults to 20. */
    divisions?: number;
}
/**
 * A grid geometry.
 */
export declare class Grid extends AbstractGeometry {
    /** The total size of the grid. */
    size: number;
    /** The number of divisions. */
    divisions: number;
    /**
     * Creates a new Grid geometry.
     * @param options The configuration options for the grid.
     */
    constructor(options?: GridOptions);
    /** @inheritdoc */
    protected generateGeometryData(): void;
}
