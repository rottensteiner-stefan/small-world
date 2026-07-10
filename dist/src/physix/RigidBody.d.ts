import { Vector3D } from '../math/index.js';
/**
 * A component that adds Newtonian physics capabilities to an Object3D.
 */
export declare class RigidBody {
    /** The mass of the object. 0 means static/kinematic (infinite mass). */
    mass: number;
    /** Precalculated inverse mass for performance. */
    readonly inverseMass: number;
    /** Current velocity vector. */
    velocity: Vector3D;
    /** Current acceleration vector. */
    acceleration: Vector3D;
    /** Accumulated forces for the current integration step. */
    forces: Vector3D;
    /** How much velocity is retained after a bounce (0.0 = clay, 1.0 = superball). */
    restitution: number;
    /** How much velocity is retained when sliding along a surface (0.0 = ice, 1.0 = velcro). */
    friction: number;
    /**
     * @param mass The initial mass. Use 0 for static objects.
     */
    constructor(mass?: number);
    /**
     * Applies a continuous force to the center of mass.
     * @param force The force vector to apply.
     */
    applyForce(force: Vector3D): void;
    /**
     * Applies an instantaneous impulse to the center of mass, directly altering velocity.
     * @param impulse The impulse vector.
     */
    applyImpulse(impulse: Vector3D): void;
    /**
     * Clears all accumulated forces. Called by the PhysicsSystem after integration.
     */
    clearForces(): void;
}
