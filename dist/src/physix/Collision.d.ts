import { BoundingBox } from './BoundingBox.js';
import { BoundingSphere } from './BoundingSphere.js';
import { OBB } from './OBB.js';
import { BoundingVolume } from '../interfaces/index.js';
import { Vector3D } from '../math/index.js';
/**
 * Static class for collision detection and resolution.
 */
export declare class Collision {
    private static _tempBoxObb;
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
    /**
     * Resolves collision between an axis-aligned box and an oriented bounding box, returning a correction vector.
     * @param b The box.
     * @param o The OBB.
     * @param result Vector to store the correction (points from o to b).
     * @returns True if collision was resolved.
     */
    static resolveBoxObb(b: BoundingBox, o: OBB, result: Vector3D): boolean;
    /**
     * Resolves collision between a sphere and an OBB, returning a correction vector.
     * @param s The sphere.
     * @param o The OBB.
     * @param result Vector to store the correction (points from the OBB towards the sphere).
     * @returns True if collision was resolved.
     */
    static resolveSphereObb(s: BoundingSphere, o: OBB, result: Vector3D): boolean;
    /**
     * Resolves collision between two OBBs via the Separating Axis Theorem,
     * returning the minimum-translation-vector correction.
     * @param a The first OBB.
     * @param b The second OBB.
     * @param result Vector to store the correction (points from b to a, along the axis of least penetration).
     * @returns True if collision was resolved.
     */
    static resolveObbObb(a: OBB, b: OBB, result: Vector3D): boolean;
    private static _sphereSphere;
    private static _boxBox;
    private static _boxObb;
    /**
     * Performs the Separating Axis Theorem (SAT) test for two OBBs.
     * Returns true if they intersect.
     */
    private static _obbObb;
    /**
     * Signed SAT overlap along a single axis: positive/zero means the OBBs
     * overlap by that depth along the axis, negative means the axis separates
     * them entirely. Shared by `_testAxis` (boolean detection) and
     * `resolveObbObb` (needs the actual depth to find the minimum-translation axis).
     */
    private static _axisOverlap;
    /**
     * Tests a single axis for SAT. Returns false if a separating gap is found.
     */
    private static _testAxis;
    private static _sphereBox;
    private static _sphereObb;
}
