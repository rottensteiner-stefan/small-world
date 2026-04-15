import { BoundingVolume } from '../interfaces/index.js';
/**
 * Static class for collision detection tests.
 */
export declare class Collision {
    /**
     * Performs a collision test between two bounding volumes.
     * @param a The first volume.
     * @param b The second volume.
     * @returns True if the volumes intersect.
     */
    static test(a: BoundingVolume, b: BoundingVolume): boolean;
    private static _sphereSphere;
    private static _boxBox;
    private static _sphereBox;
}
