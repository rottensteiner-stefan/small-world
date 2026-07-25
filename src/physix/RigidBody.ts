import { Vector3D, MathPool } from "../math/index.js";

/**
 * A component that adds Newtonian physics capabilities to an Object3D.
 */
export class RigidBody {
  /** The mass of the object. 0 means static/kinematic (infinite mass). */
  public mass: number;
  /** Precalculated inverse mass for performance. */
  public readonly inverseMass: number;

  /** If true, the body detects collisions but does not physically resolve them. */
  public isSensor: boolean = false;

  /** Current velocity vector. */
  public velocity: Vector3D = new Vector3D();
  /** Current acceleration vector. */
  public acceleration: Vector3D = new Vector3D();
  /** Accumulated forces for the current integration step. */
  public forces: Vector3D = new Vector3D();

  /** Current angular velocity vector. */
  public angularVelocity: Vector3D = new Vector3D();
  /** Current angular acceleration vector. */
  public angularAcceleration: Vector3D = new Vector3D();
  /** Accumulated torque for the current integration step. */
  public torque: Vector3D = new Vector3D();

  /** Scalar approximation of moment of inertia. */
  public inertia: number;
  /** Precalculated inverse inertia. */
  public readonly inverseInertia: number;
  /** Angular damping, simulates rotational friction. */
  public angularDamping: number = 0.98;

  /** How much velocity is retained after a bounce (0.0 = clay, 1.0 = superball). */
  public restitution: number = 0.2;
  /** How much velocity is retained when sliding along a surface (0.0 = ice, 1.0 = velcro). */
  public friction: number = 0.98;

  /**
   * @param mass The initial mass. Use 0 for static objects.
   * @param inertia The scalar moment of inertia. Defaults to mass.
   */
  constructor(mass: number = 1.0, inertia: number = mass) {
    this.mass = mass;
    this.inverseMass = mass > 0 ? 1.0 / mass : 0;
    this.inertia = inertia;
    this.inverseInertia = inertia > 0 ? 1.0 / inertia : 0;
  }

  /**
   * Applies a continuous force to the center of mass.
   * @param force The force vector to apply.
   */
  public applyForce(force: Vector3D): void {
    if (this.inverseMass === 0) return;
    this.forces.add(force);
  }

  /**
   * Applies a torque (rotational force).
   * @param torque The torque vector to apply.
   */
  public applyTorque(torque: Vector3D): void {
    if (this.inverseInertia === 0) return;
    this.torque.add(torque);
  }

  /**
   * Applies an instantaneous impulse to the center of mass, directly altering velocity.
   * @param impulse The impulse vector.
   */
  public applyImpulse(impulse: Vector3D): void {
    if (this.inverseMass === 0) return;
    const dv = MathPool.acquireVector().copyFrom(impulse).scale(this.inverseMass);
    this.velocity.add(dv);
    MathPool.releaseVector(dv);
  }

  /**
   * Clears all accumulated forces and torques. Called by the PhysicsSystem after integration.
   */
  public clearForces(): void {
    this.forces.set(0, 0, 0);
    this.torque.set(0, 0, 0);
  }
}
