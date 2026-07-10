/// src/physix/PhysicsSystem.ts
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D, MathPool } from "../math/index.js";

/**
 * A lightweight physics solver using Semi-Implicit Euler integration.
 */
export class PhysicsSystem {
  /** Global gravity vector (default: -9.81 on Y) */
  public gravity: Vector3D = new Vector3D(0, -9.81, 0);

  /**
   * Steps the physics simulation forward.
   * @param scene The scene containing objects with RigidBodies.
   * @param dt Delta time in seconds.
   */
  public step(scene: Scene, dt: number): void {
    if (dt <= 0) return;

    // 1. Collect all dynamic rigidbodies
    const bodies: Object3D[] = [];

    // In a highly optimized engine, the Scene might maintain a flat list of dynamic bodies.
    // For now, we iterate over all objects.
    for (const obj of scene.objects) {
      if (obj.rigidBody && obj.rigidBody.inverseMass > 0) {
        bodies.push(obj);
      }
    }

    // 2. Integration Step (Semi-Implicit Euler)
    for (const obj of bodies) {
      const rb = obj.rigidBody!;

      // Apply Gravity
      const gravityForce = MathPool.acquireVector().copyFrom(this.gravity).scale(rb.mass);
      rb.applyForce(gravityForce);
      MathPool.releaseVector(gravityForce);

      // acceleration = forces / mass
      rb.acceleration.copyFrom(rb.forces).scale(rb.inverseMass);

      // Semi-Implicit Euler: Update velocity first, then position
      // v = v + a * dt
      const deltaV = MathPool.acquireVector().copyFrom(rb.acceleration).scale(dt);
      rb.velocity.add(deltaV);
      MathPool.releaseVector(deltaV);

      // Apply Friction/Damping (simple approach)
      rb.velocity.scale(rb.friction);

      // p = p + v * dt
      const deltaP = MathPool.acquireVector().copyFrom(rb.velocity).scale(dt);
      obj.position.add(deltaP);
      MathPool.releaseVector(deltaP);

      // Update bounds if necessary
      obj.updateMatrix();

      // Clear forces for next frame
      rb.clearForces();
    }

    // 3. Collision Detection (Broad Phase & Narrow Phase)
    // Here we will query the SpatialHash/Octree and resolve collisions via SAT.
    this._resolveCollisions(scene, bodies, dt);
  }

  private _resolveCollisions(scene: Scene, bodies: Object3D[], dt: number): void {
    // TODO: Implement Separation Axis Theorem (SAT) resolution here.
    // We will push objects apart (positional correction) and apply restitution (bounce).
  }
}
