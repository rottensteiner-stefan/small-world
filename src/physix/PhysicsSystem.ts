/// src/physix/PhysicsSystem.ts
import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D, MathPool } from "../math/index.js";
import { Collision } from "./Collision.js";
import { BoundingSphere } from "./BoundingSphere.js";
import { BoundingBox } from "./BoundingBox.js";
import { UniversalEventBus } from "../core/events/UniversalEventBus.js";

/**
 * A lightweight physics solver using Semi-Implicit Euler integration.
 */
export class PhysicsSystem {
  /** Global gravity vector (default: -9.81 on Y) */
  public gravity: Vector3D = new Vector3D(0, -9.81, 0);

  private _bodies: Object3D[] = [];
  private _allColliders: Object3D[] = [];
  private _collisionEvent = {
    objectA: null as unknown as Object3D,
    objectB: null as unknown as Object3D,
    impulse: 0,
  };

  /**
   * Steps the physics simulation forward.
   * @param scene The scene containing objects with RigidBodies.
   * @param dt Delta time in seconds.
   */
  public step(scene: Scene, dt: number): void {
    if (dt <= 0) return;

    // 1. Collect all dynamic rigidbodies
    const bodies = this._bodies;
    bodies.length = 0;

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

      // --- Angular Integration ---
      // angularAcceleration = torque / inertia
      rb.angularAcceleration.copyFrom(rb.torque).scale(rb.inverseInertia);

      // w = w + alpha * dt
      const deltaW = MathPool.acquireVector().copyFrom(rb.angularAcceleration).scale(dt);
      rb.angularVelocity.add(deltaW);
      MathPool.releaseVector(deltaW);

      // Apply Angular Damping
      rb.angularVelocity.scale(rb.angularDamping);

      // Apply angular velocity to Object3D rotation
      const wLength = rb.angularVelocity.length();
      if (wLength > 0.000001) {
        // 1. Create delta quaternion
        const axis = MathPool.acquireVector()
          .copyFrom(rb.angularVelocity)
          .scale(1.0 / wLength);
        const deltaQ = MathPool.acquireQuaternion().setFromAxisAngle(axis, wLength * dt);

        // 2. Create current rotation quaternion from Euler angles (YXZ via compose)
        const currentMatrix = MathPool.acquireMatrix().compose(
          MathPool.acquireVector().set(0, 0, 0),
          obj.rotation,
          MathPool.acquireVector().set(1, 1, 1),
        );
        const currentQ = MathPool.acquireQuaternion().setFromRotationMatrix(currentMatrix);

        // 3. Apply deltaQ
        currentQ.premultiply(deltaQ).normalize();

        // 4. Convert back to Euler angles
        currentMatrix.setFromQuaternion(currentQ);
        currentMatrix.decompose(MathPool.acquireVector(), obj.rotation, MathPool.acquireVector());

        // Release pool objects
        MathPool.releaseVector(axis);
        MathPool.releaseQuaternion(deltaQ);
        MathPool.releaseQuaternion(currentQ);
        MathPool.releaseMatrix(currentMatrix);
        // Note: The temporary vectors used in compose/decompose will naturally be GC'd or we could pool them.
      }
      // -------------------------

      // Update bounds if necessary
      obj.updateMatrixWorld();

      // Clear forces for next frame
      rb.clearForces();
    }

    // 3. Collision Detection (Broad Phase & Narrow Phase)
    // Here we will query the SpatialHash/Octree and resolve collisions via SAT.
    this._resolveCollisions(scene, bodies, dt);
  }

  private _resolveCollisions(scene: Scene, bodies: Object3D[], _dt: number): void {
    // Collect all colliders (both static and dynamic) that have bounds
    const allColliders = this._allColliders;
    allColliders.length = 0;
    for (const obj of scene.objects) {
      if (obj.bounds) {
        allColliders.push(obj);
      }
    }

    const result = MathPool.acquireVector();
    const rv = MathPool.acquireVector();

    for (let i = 0; i < bodies.length; i++) {
      const dynObj = bodies[i]!;
      const rbA = dynObj.rigidBody!;
      if (!dynObj.bounds) continue;

      for (let j = 0; j < allColliders.length; j++) {
        const otherObj = allColliders[j]!;
        if (dynObj === otherObj) continue;

        // Avoid double resolution for dynamic vs dynamic pairs
        const otherIdx = bodies.indexOf(otherObj);
        if (otherIdx !== -1 && otherIdx <= i) continue;

        const boundsA = dynObj.bounds;
        const boundsB = otherObj.bounds!;

        let collisionFound = false;

        // BoundingType.SPHERE = 0, BOX = 1
        if (boundsA.type === 0 && boundsB.type === 0) {
          collisionFound = Collision.resolveSphereSphere(
            boundsA as BoundingSphere,
            boundsB as BoundingSphere,
            result,
          );
        } else if (boundsA.type === 0 && boundsB.type === 1) {
          collisionFound = Collision.resolveSphereBox(
            boundsA as BoundingSphere,
            boundsB as BoundingBox,
            result,
          );
        } else if (boundsA.type === 1 && boundsB.type === 0) {
          collisionFound = Collision.resolveSphereBox(
            boundsB as BoundingSphere,
            boundsA as BoundingBox,
            result,
          );
          if (collisionFound) result.scale(-1); // Reverse direction
        }

        if (collisionFound) {
          const depth = result.length();
          if (depth > 0) {
            const normal = result.scale(1.0 / depth);
            const rbB = otherObj.rigidBody;
            const invMassA = rbA.inverseMass;
            const invMassB = rbB ? rbB.inverseMass : 0;
            const totalInvMass = invMassA + invMassB;

            if (totalInvMass > 0) {
              // 1. Positional correction (prevent sinking)
              // We use a simple linear projection to separate objects based on mass ratio
              const correction = depth / totalInvMass;

              const posCorrA = MathPool.acquireVector()
                .copyFrom(normal)
                .scale(correction * invMassA);
              dynObj.position.add(posCorrA);
              MathPool.releaseVector(posCorrA);

              if (rbB) {
                const posCorrB = MathPool.acquireVector()
                  .copyFrom(normal)
                  .scale(-correction * invMassB);
                otherObj.position.add(posCorrB);
                MathPool.releaseVector(posCorrB);
              }

              dynObj.updateMatrixWorld();
              if (rbB) otherObj.updateMatrixWorld();

              // 2. Impulse Resolution (Bouncing)
              const velA = rbA.velocity;
              const velB = rbB ? rbB.velocity : MathPool.acquireVector().set(0, 0, 0);

              rv.copyFrom(velA).sub(velB);
              const velAlongNormal = rv.dot(normal);

              // Do not resolve if velocities are already separating
              if (velAlongNormal < 0) {
                const e = Math.min(rbA.restitution, rbB ? rbB.restitution : 0.2);
                let jMag = -(1 + e) * velAlongNormal;
                jMag /= totalInvMass;

                const impulse = MathPool.acquireVector().copyFrom(normal).scale(jMag);
                rbA.applyImpulse(impulse);
                if (rbB) {
                  impulse.scale(-1);
                  rbB.applyImpulse(impulse);
                }
                MathPool.releaseVector(impulse);

                this._collisionEvent.objectA = dynObj;
                this._collisionEvent.objectB = otherObj;
                this._collisionEvent.impulse = jMag;
                UniversalEventBus.dispatchEvent("physics:collision", this._collisionEvent);
              }

              // Release temp static zero vector if rbB didn't exist
              if (!rbB) {
                MathPool.releaseVector(velB);
              }
            }
          }
        }
      }
    }

    MathPool.releaseVector(result);
    MathPool.releaseVector(rv);
  }
}
