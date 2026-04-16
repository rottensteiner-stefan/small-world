import { BoundingVolume } from '../interfaces/index.js';
/**
 * Static class for collision detection tests between different bounding volumes.
 */
export declare class Collision {
    /**
     * Performs a collision test between two bounding volumes.
     * Dispatches to specialized tests based on volume types.
     * @param a The first bounding volume.
     * @param b The second bounding volume.
     * @returns True if the volumes intersect.
     */
    static test(a: BoundingVolume, b: BoundingVolume): boolean;
    /**
     * Tests intersection between two spheres.
     * @param s1 The first sphere.
     * @param s2 The second sphere.
     * @returns True if they intersect.
     * @private
     */
    private static _sphereSphere;
    /**
     * Tests intersection between two axis-aligned bounding boxes.
     * @param b1 The first box.
     * @param b2 The second box.
     * @returns True if they intersect.
     * @private
     */
    private static _boxBox;
    /**
     * Tests intersection between a sphere and an axis-aligned bounding box.
     * @param s The sphere.
     * @param b The box.
     * @returns True if they intersect.
     * @private
     */
    private static _sphereBox;
}
