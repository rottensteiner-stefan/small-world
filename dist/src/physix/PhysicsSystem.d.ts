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
     * Recursively collects dynamic rigidbodies.
     */
    private _collectBodiesRecursive;
    /**
     * Steps the physics simulation forward.
     * @param scene The scene containing objects with RigidBodies.
     * @param dt Delta time in seconds.
     */
    step(scene: Scene, dt: number): void;
    /**
     * Recursively collects all objects that have bounds and are collidable.
     */
    private _collectCollidersRecursive;
    private _resolveCollisions;
}
