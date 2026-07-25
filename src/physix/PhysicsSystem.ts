import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Octree } from "../core/Octree.js";
import { Vector3D, MathPool } from "../math/index.js";
import { Collision } from "./Collision.js";
import { BoundingSphere } from "./BoundingSphere.js";
import { BoundingBox } from "./BoundingBox.js";
import { OBB } from "./OBB.js";
import { EventDispatcherImpl } from "../core/events/EventDispatcherImpl.js";
import { Collidable, BoundingVolume } from "../interfaces/index.js";
import { BoundingType } from "../enums/index.js";

/** Padding added to the computed world AABB to guard against boundary floating-point edge cases. */
const BROADPHASE_EPSILON: number = 0.01;

/**
 * A lightweight physics solver using Semi-Implicit Euler integration.
 */
export class PhysicsSystem {
  /** Global gravity vector (default: -9.81 on Y) */
  public gravity: Vector3D = new Vector3D(0, -9.81, 0);
  /** The fixed time step for physics calculations (e.g. 1/60). */
  public fixedTimeStep: number = 1 / 60;
  /** Maximum number of sub-steps per frame to prevent spiral of death. */
  public maxSubSteps: number = 10;
  /** Maximum delta time allowed per frame. */
  public maxDeltaTime: number = 0.25;

  private _accumulator: number = 0;

  private _bodies: Object3D[] = [];
  private _allColliders: Collidable[] = [];
  private _collisionEvent = {
    objectA: null as unknown as Object3D,
    objectB: null as unknown as Collidable,
    impulse: 0,
  };

  /**
   * Creates a new PhysicsSystem.
   * @param events The event bus to dispatch collision events.
   */
  constructor(private events: EventDispatcherImpl) {}

  private _broadphaseTree?: Octree;
  private _broadphaseWorldMin: Vector3D = new Vector3D();
  private _broadphaseWorldMax: Vector3D = new Vector3D();
  private _bodyIndex = new Map<Object3D, number>();
  private _broadphaseFallback: Collidable[] = [];
  private _broadphaseQueryHits: Collidable[] = [];

  private _warnedObjects = new Set<Object3D>();

  /**
   * Recursively collects both dynamic rigidbodies and collidable objects in a single pass.
   */
  private _collectRecursive(obj: Object3D, bodies: Object3D[], colliders: Collidable[]): void {
    if (obj.isCollidable) {
      if (obj.bounds) {
        colliders.push(obj);
      }
      if (obj.rigidBody && obj.rigidBody.inverseMass > 0) {
        bodies.push(obj);
      } else if (obj.bounds && !obj.rigidBody && !this._warnedObjects.has(obj)) {
        // Fail Fast / Warning: Static collidable objects should explicitly declare RigidBody(0).
        console.warn(
          `[PhysicsSystem] Warning: Object '${obj.name}' is collidable but lacks a RigidBody. Treating as static (mass=0). Add 'obj.rigidBody = new RigidBody(0);' to suppress this warning.`,
        );
        this._warnedObjects.add(obj);
      }
    }
    for (let i = 0; i < obj.children.length; i++) {
      this._collectRecursive(obj.children[i]!, bodies, colliders);
    }
  }

  /**
   * Steps the physics simulation forward.
   * @param scene The scene containing objects with RigidBodies.
   * @param dt Delta time in seconds.
   */
  public step(scene: Scene, dt: number): void {
    if (dt <= 0) return;

    // Cap dt to avoid massive lag spikes causing a spiral of death
    if (dt > this.maxDeltaTime) dt = this.maxDeltaTime;

    this._accumulator += dt;

    // 1. Collect all dynamic rigidbodies and colliders in a SINGLE pass
    const bodies = this._bodies;
    const allColliders = this._allColliders;
    bodies.length = 0;
    allColliders.length = 0;

    for (let i = 0; i < scene.objects.length; i++) {
      this._collectRecursive(scene.objects[i]!, bodies, allColliders);
    }

    // Add static colliders outside the Object3D hierarchy
    for (let i = 0; i < scene.staticColliders.length; i++) {
      const c = scene.staticColliders[i]!;
      if (c.bounds) {
        allColliders.push(c);
      }
    }

    let subSteps = 0;
    while (this._accumulator >= this.fixedTimeStep && subSteps < this.maxSubSteps) {
      this._internalStep(bodies, allColliders, this.fixedTimeStep);
      this._accumulator -= this.fixedTimeStep;
      subSteps++;
    }

    // 5. Clear Forces for next frame
    for (const obj of bodies) {
      obj.rigidBody!.clearForces();
    }
  }

  private _internalStep(bodies: Object3D[], allColliders: Collidable[], dt: number): void {
    // 2. Integration Step (Semi-Implicit Euler)
    for (const obj of bodies) {
      const rb = obj.rigidBody!;

      // acceleration = (forces / mass) + gravity
      rb.acceleration.copyFrom(rb.forces).scale(rb.inverseMass).add(this.gravity);

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
        const zeroPos = MathPool.acquireVector().set(0, 0, 0);
        const unitScale = MathPool.acquireVector().set(1, 1, 1);
        const currentMatrix = MathPool.acquireMatrix().compose(zeroPos, obj.rotation, unitScale);
        const currentQ = MathPool.acquireQuaternion().setFromRotationMatrix(currentMatrix);

        // 3. Apply deltaQ
        currentQ.premultiply(deltaQ).normalize();

        // 4. Convert back to Euler angles
        currentMatrix.setFromQuaternion(currentQ);
        const outPos = MathPool.acquireVector();
        const outScale = MathPool.acquireVector();
        currentMatrix.decompose(outPos, obj.rotation, outScale);

        // Release pool objects
        MathPool.releaseVector(axis);
        MathPool.releaseVector(zeroPos);
        MathPool.releaseVector(unitScale);
        MathPool.releaseVector(outPos);
        MathPool.releaseVector(outScale);
        MathPool.releaseQuaternion(deltaQ);
        MathPool.releaseQuaternion(currentQ);
        MathPool.releaseMatrix(currentMatrix);
      }
      // -------------------------

      // Update bounds if necessary
      obj.updateMatrixWorld();
      obj.computeBounds();

      // Clear forces for next frame
      rb.clearForces();
    }

    // 3. Collision Detection (Broad Phase & Narrow Phase)
    this._resolveCollisions(bodies, allColliders);
  }

  /**
   * Expands the running world AABB (min/max) to include a collider's bounds.
   */
  private _trackColliderBounds(bounds: BoundingVolume): void {
    const r = bounds.getBroadRadius();
    const cx = bounds.center.x;
    const cy = bounds.center.y;
    const cz = bounds.center.z;

    if (cx - r < this._broadphaseWorldMin.x) this._broadphaseWorldMin.x = cx - r;
    if (cy - r < this._broadphaseWorldMin.y) this._broadphaseWorldMin.y = cy - r;
    if (cz - r < this._broadphaseWorldMin.z) this._broadphaseWorldMin.z = cz - r;

    if (cx + r > this._broadphaseWorldMax.x) this._broadphaseWorldMax.x = cx + r;
    if (cy + r > this._broadphaseWorldMax.y) this._broadphaseWorldMax.y = cy + r;
    if (cz + r > this._broadphaseWorldMax.z) this._broadphaseWorldMax.z = cz + r;
  }

  private _resolveCollisions(bodies: Object3D[], allColliders: Collidable[]): void {
    this._broadphaseWorldMin.set(Infinity, Infinity, Infinity);
    this._broadphaseWorldMax.set(-Infinity, -Infinity, -Infinity);

    for (let i = 0; i < allColliders.length; i++) {
      this._trackColliderBounds(allColliders[i]!.bounds!);
    }

    this._broadphaseWorldMin.x -= BROADPHASE_EPSILON;
    this._broadphaseWorldMin.y -= BROADPHASE_EPSILON;
    this._broadphaseWorldMin.z -= BROADPHASE_EPSILON;
    this._broadphaseWorldMax.x += BROADPHASE_EPSILON;
    this._broadphaseWorldMax.y += BROADPHASE_EPSILON;
    this._broadphaseWorldMax.z += BROADPHASE_EPSILON;

    // Lazily construct the broadphase tree once; on every subsequent frame its root
    // BoundingBox.min/max are the *same* Vector3D instances as
    // _broadphaseWorldMin/_broadphaseWorldMax (BoundingBox stores them by reference),
    // so mutating those fields above already moved the tree's bounds. Only `center`
    // is a value computed once at construction time and must be refreshed manually.
    if (!this._broadphaseTree) {
      this._broadphaseTree = new Octree(
        new BoundingBox(this._broadphaseWorldMin, this._broadphaseWorldMax),
      );
    } else {
      this._broadphaseTree.root.bounds.center
        .copyFrom(this._broadphaseWorldMin)
        .add(this._broadphaseWorldMax)
        .scale(0.5);
      this._broadphaseTree.clear();
    }
    const broadphaseTree = this._broadphaseTree;

    this._broadphaseFallback.length = 0;
    for (let i = 0; i < allColliders.length; i++) {
      if (!broadphaseTree.insert(allColliders[i]!)) {
        this._broadphaseFallback.push(allColliders[i]!);
      }
    }

    this._bodyIndex.clear();
    for (let i = 0; i < bodies.length; i++) {
      this._bodyIndex.set(bodies[i]!, i);
    }

    const result = MathPool.acquireVector();
    const rv = MathPool.acquireVector();

    for (let i = 0; i < bodies.length; i++) {
      const dynObj = bodies[i]!;
      const rbA = dynObj.rigidBody!;
      if (!dynObj.bounds) continue;

      this._broadphaseQueryHits.length = 0;
      broadphaseTree.queryVolume(dynObj.bounds, this._broadphaseQueryHits);
      // Append fallback
      for (let f = 0; f < this._broadphaseFallback.length; f++) {
        this._broadphaseQueryHits.push(this._broadphaseFallback[f]!);
      }

      for (let j = 0; j < this._broadphaseQueryHits.length; j++) {
        const otherObj = this._broadphaseQueryHits[j]!;
        if (dynObj === otherObj) continue;

        // Non-Object3D colliders (e.g. StaticCollider) have no rigidBody and
        // can never be a dynamic body themselves.
        const otherAsBody: Object3D | undefined =
          otherObj instanceof Object3D ? otherObj : undefined;

        // Avoid double resolution for dynamic vs dynamic pairs
        const otherIdx = otherAsBody ? this._bodyIndex.get(otherAsBody) : undefined;
        if (otherIdx !== undefined && otherIdx <= i) continue;

        const boundsA = dynObj.bounds;
        const boundsB = otherObj.bounds!;

        let collisionFound = false;

        if (BoundingType.SPHERE === boundsA.type && BoundingType.SPHERE === boundsB.type) {
          collisionFound = Collision.resolveSphereSphere(
            boundsA as BoundingSphere,
            boundsB as BoundingSphere,
            result,
          );
        } else if (BoundingType.SPHERE === boundsA.type && BoundingType.BOX === boundsB.type) {
          collisionFound = Collision.resolveSphereBox(
            boundsA as BoundingSphere,
            boundsB as BoundingBox,
            result,
          );
        } else if (BoundingType.BOX === boundsA.type && BoundingType.SPHERE === boundsB.type) {
          collisionFound = Collision.resolveSphereBox(
            boundsB as BoundingSphere,
            boundsA as BoundingBox,
            result,
          );
          if (collisionFound) result.scale(-1); // Reverse direction
        } else if (BoundingType.BOX === boundsA.type && BoundingType.BOX === boundsB.type) {
          collisionFound = Collision.resolveBoxBox(
            boundsA as BoundingBox,
            boundsB as BoundingBox,
            result,
          );
        } else if (BoundingType.SPHERE === boundsA.type && BoundingType.OBB === boundsB.type) {
          collisionFound = Collision.resolveSphereObb(
            boundsA as BoundingSphere,
            boundsB as unknown as OBB,
            result,
          );
        } else if (BoundingType.OBB === boundsA.type && BoundingType.SPHERE === boundsB.type) {
          collisionFound = Collision.resolveSphereObb(
            boundsB as BoundingSphere,
            boundsA as unknown as OBB,
            result,
          );
          if (collisionFound) result.scale(-1); // Reverse direction
        } else if (BoundingType.BOX === boundsA.type && BoundingType.OBB === boundsB.type) {
          collisionFound = Collision.resolveBoxObb(
            boundsA as BoundingBox,
            boundsB as unknown as OBB,
            result,
          );
        } else if (BoundingType.OBB === boundsA.type && BoundingType.BOX === boundsB.type) {
          collisionFound = Collision.resolveBoxObb(
            boundsB as BoundingBox,
            boundsA as unknown as OBB,
            result,
          );
          if (collisionFound) result.scale(-1); // Reverse direction
        } else if (BoundingType.OBB === boundsA.type && BoundingType.OBB === boundsB.type) {
          collisionFound = Collision.resolveObbObb(
            boundsA as unknown as OBB,
            boundsB as unknown as OBB,
            result,
          );
        }

        if (collisionFound) {
          const depth = result.length();
          if (depth > 0) {
            const normal = result.scale(1.0 / depth);
            const rbB = otherAsBody?.rigidBody;
            const invMassA = rbA.inverseMass;
            const invMassB = rbB ? rbB.inverseMass : 0;
            const totalInvMass = invMassA + invMassB;

            if (rbA.isSensor || (rbB && rbB.isSensor)) {
              this.events.dispatchEvent("physics:collision", {
                objectA: dynObj,
                objectB: otherObj,
                normal: normal,
                depth: depth,
                impulse: 0,
              });
              continue;
            }

            if (totalInvMass > 0) {
              // 1. Positional correction (prevent sinking)
              // We use a simple linear projection to separate objects based on mass ratio
              // Added a tiny epsilon (0.005) to counteract visual polygon intersection.
              const correction = depth / totalInvMass + 0.005;

              const posCorrA = MathPool.acquireVector()
                .copyFrom(normal)
                .scale(correction * invMassA);
              dynObj.position.add(posCorrA);
              MathPool.releaseVector(posCorrA);

              if (rbB && otherAsBody) {
                const posCorrB = MathPool.acquireVector()
                  .copyFrom(normal)
                  .scale(-correction * invMassB);
                otherAsBody.position.add(posCorrB);
                MathPool.releaseVector(posCorrB);
              }

              dynObj.updateMatrixWorld();
              if (rbB && otherAsBody) otherAsBody.updateMatrixWorld();

              // 2. Impulse Resolution (Bouncing)
              const velA = rbA.velocity;
              const velB = rbB ? rbB.velocity : MathPool.acquireVector().set(0, 0, 0);

              rv.copyFrom(velA).sub(velB);
              const velAlongNormal = rv.dot(normal);

              // Do not resolve if velocities are already separating
              if (velAlongNormal < 0) {
                // If velocity is low (resting contact), set e=0 to prevent infinite jitter
                const restA = rbA ? rbA.restitution : 0.2;
                const restB = rbB ? rbB.restitution : 0.2;
                const e = velAlongNormal > -0.5 ? 0 : Math.min(restA, restB);
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
                this.events.dispatchEvent("physics:collision", this._collisionEvent);
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
