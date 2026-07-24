import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
import { EventDispatcherImpl } from '../core/events/EventDispatcherImpl.js';
/**
 * A lightweight physics solver using Semi-Implicit Euler integration.
 */
export declare class PhysicsSystem {
    private events;
    /** Global gravity vector (default: -9.81 on Y) */
    gravity: Vector3D;
    /** The fixed time step for physics calculations (e.g. 1/60). */
    fixedTimeStep: number;
    /** Maximum number of sub-steps per frame to prevent spiral of death. */
    maxSubSteps: number;
    /** Maximum delta time allowed per frame. */
    maxDeltaTime: number;
    private _accumulator;
    private _bodies;
    private _allColliders;
    private _collisionEvent;
    /**
     * Creates a new PhysicsSystem.
     * @param events The event bus to dispatch collision events.
     */
    constructor(events: EventDispatcherImpl);
    private _broadphaseTree?;
    private _broadphaseWorldMin;
    private _broadphaseWorldMax;
    private _bodyIndex;
    private _broadphaseFallback;
    private _broadphaseQueryHits;
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
    private _internalStep;
    /**
     * Expands the running world AABB (min/max) to include a collider's bounds.
     */
    private _trackColliderBounds;
    private _resolveCollisions;
}
