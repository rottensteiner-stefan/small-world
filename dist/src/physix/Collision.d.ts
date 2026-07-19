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
    /**
     * Resolves collision between two spheres, returning a correction vector.
     * @param s1 The first sphere.
     * @param s2 The second sphere.
     * @param result Vector to store the correction (points from s2 to s1).
     * @returns True if collision was resolved.
     */
    static resolveSphereSphere(s1: BoundingSphere, s2: BoundingSphere, result: Vector3D): boolean;
    /**
     * Resolves collision between two axis-aligned boxes, returning a correction vector.
     * @param b1 The first box.
     * @param b2 The second box.
     * @param result Vector to store the correction (points from b2 to b1, along the axis of least penetration).
     * @returns True if collision was resolved.
     */
    static resolveBoxBox(b1: BoundingBox, b2: BoundingBox, result: Vector3D): boolean;
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
