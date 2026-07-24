import { Collidable, BoundingVolume } from '../interfaces/index.js';
/**
 * A simple 2D spatial hash for fast broad-phase collision detection on the XZ plane.
 * Useful for grid-based games like YAD where vertical checks are mostly irrelevant for walls.
 */
export declare class SpatialHash {
    cellSize: number;
    private _cells;
    private _tableSize;
    /**
     * @param cellSize The size of a single grid cell. E.g. if walls are 2 units, use 2.
     * @param tableSize The number of hash buckets. Use a prime number for fewer collisions.
     */
    constructor(cellSize?: number, tableSize?: number);
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
    query(volume: BoundingVolume, outResult: Collidable[]): void;
    /**
     * Queries for potential collisions along a ray on the XZ plane.
     * This is a simple broad-phase approach stepping along the ray direction.
     */
    queryRay(ray: import('./Ray.js').Ray, outResult: Collidable[], maxDistance?: number): void;
    private _getHash;
}
