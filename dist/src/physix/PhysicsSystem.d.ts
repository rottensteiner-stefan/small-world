import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
/**
 * A lightweight physics solver using Semi-Implicit Euler integration.
 */
export declare class PhysicsSystem {
    /** Global gravity vector (default: -9.81 on Y) */
    gravity: Vector3D;
    private _bodies;
    private _allColliders;
    private _collisionEvent;
    private _broadphaseTree?;
    private _broadphaseWorldMin;
    private _broadphaseWorldMax;
    private _bodyIndex;
    private _broadphaseFallback;
    private _warnedObjects;
    /**
     * Recursively collects both dynamic rigidbodies and collidable objects in a single pass.
     */
    private _collectRecursive;
    /**
     * Steps the physics simulation forward.
     * @param scene The scene containing objects with RigidBodies.
     * @param dt Delta time in seconds.
     */
    step(scene: Scene, dt: number): void;
    /**
     * Expands the running world AABB (min/max) to include a collider's bounds.
     */
    private _trackColliderBounds;
    private _resolveCollisions;
}
