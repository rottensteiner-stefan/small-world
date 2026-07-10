import { BoundingBox } from './BoundingBox.js';
import { BoundingSphere } from './BoundingSphere.js';
import { BoundingVolume } from '../interfaces/index.js';
import { Vector3D } from '../math/index.js';
/**
 * Static class for collision detection and resolution.
 */
export declare class Collision {
    /**
     * Performs a collision test between two bounding volumes.
     */
    static test(a: BoundingVolume, b: BoundingVolume): boolean;
    /**
     * Resolves collision between a sphere and a box, returning a correction vector.
     * @param s The sphere (e.g. Camera).
     * @param b The box (e.g. Wall).
     * @param result Vector to store the correction.
     * @returns True if collision was resolved.
     */
    static resolveSphereBox(s: BoundingSphere, b: BoundingBox, result: Vector3D): boolean;
    private static _sphereSphere;
    private static _boxBox;
    /**
     * Performs the Separating Axis Theorem (SAT) test for two OBBs.
     * Returns true if they intersect.
     */
    private static _obbObb;
    /**
     * Tests a single axis for SAT. Returns false if a separating gap is found.
     */
    private static _testAxis;
    private static _sphereBox;
}
