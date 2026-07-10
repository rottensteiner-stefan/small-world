import { Collidable, BoundingVolume } from '../interfaces/index.js';
/**
 * A simple 2D spatial hash for fast broad-phase collision detection on the XZ plane.
 * Useful for grid-based games like YAD where vertical checks are mostly irrelevant for walls.
 */
export declare class SpatialHash {
    cellSize: number;
    private _grid;
    /**
     * @param cellSize The size of a single grid cell. E.g. if walls are 2 units, use 2.
     */
    constructor(cellSize?: number);
    /**
     * Inserts an object into the spatial hash based on its bounding volume.
     */
    insert(obj: Collidable): void;
    /**
     * Clears the spatial hash.
     */
    clear(): void;
    /**
     * Queries for potential collisions in the given volume's area.
     */
    query(volume: BoundingVolume): Collidable[];
    /**
     * Queries for potential collisions along a ray on the XZ plane.
     * This is a simple broad-phase approach stepping along the ray direction.
     */
    queryRay(ray: import('./Ray.js').Ray, maxDistance?: number): Collidable[];
    private _getKey;
}
