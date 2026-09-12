import { Vector3D, MathPool } from "../math/index.js";

/**
 * A component that adds Newtonian physics capabilities to an Object3D.
 */
export class RigidBody {
  private _mass: number;
  private _inverseMass: number;

  /** The mass of the object. 0 means static/kinematic (infinite mass). */
  public get mass(): number {
    return this._mass;
  }

  public set mass(value: number) {
    this._mass = value;
    this._inverseMass = value > 0 ? 1.0 / value : 0;
  }

  /** Precalculated inverse mass for performance. */
  public get inverseMass(): number {
    return this._inverseMass;
  }

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

  private _inertia: number;
  private _inverseInertia: number;

  /** Scalar approximation of moment of inertia. */
  public get inertia(): number {
    return this._inertia;
  }

  public set inertia(value: number) {
    this._inertia = value;
    this._inverseInertia = value > 0 ? 1.0 / value : 0;
  }

  /** Precalculated inverse inertia. */
  public get inverseInertia(): number {
    return this._inverseInertia;
  }
  /** Angular damping, simulates rotational friction. */
  public angularDamping: number = 0.98;

  /** How much velocity is retained after a bounce (0.0 = clay, 1.0 = superball). */
  public restitution: number = 0.2;
  /** How much velocity is retained when sliding along a surface (0.0 = ice, 1.0 = velcro). */
  public friction: number = 0.98;

  /**
   * Position at the start of the most recently completed fixed-timestep substep. Together with
   * the object's current (post-substep) position, this lets `PhysicsSystem.applyRenderInterpolation`
   * blend the rendered transform between the two, decoupling the render framerate from the fixed
   * physics tick instead of snapping to the latest substep every frame.
   */
  public prevPosition: Vector3D = new Vector3D();
  /** Rotation (Euler, radians) counterpart to `prevPosition` -- see its doc for details. */
  public prevRotation: Vector3D = new Vector3D();

  /**
   * @param mass The initial mass. Use 0 for static objects.
   * @param inertia The scalar moment of inertia. Defaults to mass.
   */
  constructor(mass: number = 1.0, inertia: number = mass) {
    this._mass = mass;
    this._inverseMass = mass > 0 ? 1.0 / mass : 0;
    this._inertia = inertia;
    this._inverseInertia = inertia > 0 ? 1.0 / inertia : 0;
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
