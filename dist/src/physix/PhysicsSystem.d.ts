import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/index.js';
/**
 * A lightweight physics solver using Semi-Implicit Euler integration.
 */
export declare class PhysicsSystem {
    /** Global gravity vector (default: -9.81 on Y) */
    gravity: Vector3D;
    /**
     * Steps the physics simulation forward.
     * @param scene The scene containing objects with RigidBodies.
     * @param dt Delta time in seconds.
     */
    step(scene: Scene, dt: number): void;
    private _resolveCollisions;
}
