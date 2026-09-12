import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D, MathPool } from "../math/index.js";
import { Collision } from "./Collision.js";
import { BoundingSphere } from "./BoundingSphere.js";
import { BoundingBox } from "./BoundingBox.js";
import { OBB } from "./OBB.js";
import { EventDispatcherImpl } from "../core/events/EventDispatcherImpl.js";
import { Collidable } from "../interfaces/index.js";
import { BoundingType } from "../enums/index.js";
import { FluidVolume } from "./FluidVolume.js";
import { BuoyancySolver } from "./fluids/BuoyancySolver.js";
import { PhysicsBroadphase } from "./broadphase/PhysicsBroadphase.js";
import { SweptSphereCCD } from "./ccd/SweptSphereCCD.js";
import { EulerIntegrator } from "./solvers/EulerIntegrator.js";

/**
 * A lightweight physics solver using Semi-Implicit Euler integration and spatial broadphase acceleration.
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
  /**
   * Continuous Collision Detection (CCD) threshold, as a multiple of a sphere body's own radius.
   * Set to `Infinity` to disable CCD entirely.
   */
  public ccdMotionThreshold: number = 1.0;

  private _accumulator: number = 0;
  private _bodies: Object3D[] = [];
  private _allColliders: Collidable[] = [];
  private _fluidVolumes: FluidVolume[] = [];
  private _collisionEvent = {
    objectA: null as unknown as Object3D,
    objectB: null as unknown as Collidable,
    impulse: 0,
  };

  private _broadphase = new PhysicsBroadphase();
  private _ccd = new SweptSphereCCD();
  private _bodyIndex = new Map<Object3D, number>();
  private _broadphaseQueryHits: Collidable[] = [];
  private _warnedObjects = new Set<Object3D>();

  /**
   * Creates a new PhysicsSystem.
   * @param events The event bus to dispatch collision events.
   */
  constructor(private events: EventDispatcherImpl) {}

  public addFluidVolume(fv: FluidVolume): void {
    if (!this._fluidVolumes.includes(fv)) {
      this._fluidVolumes.push(fv);
    }
  }

  public removeFluidVolume(fv: FluidVolume): void {
    const idx = this._fluidVolumes.indexOf(fv);
    if (idx !== -1) {
      this._fluidVolumes.splice(idx, 1);
    }
  }

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

    if (dt > this.maxDeltaTime) dt = this.maxDeltaTime;

    this._accumulator += dt;

    const bodies = this._bodies;
    const allColliders = this._allColliders;
    bodies.length = 0;
    allColliders.length = 0;

    for (let i = 0; i < scene.objects.length; i++) {
      this._collectRecursive(scene.objects[i]!, bodies, allColliders);
    }

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

    for (const obj of bodies) {
      obj.rigidBody!.clearForces();
    }
  }

  /**
   * How far the accumulator has progressed into the next fixed timestep [0, 1).
   */
  public get interpolationAlpha(): number {
    return this._accumulator / this.fixedTimeStep;
  }

  /**
   * Renders every tracked rigid body's transform interpolated between previous and current physics states.
   */
  public applyRenderInterpolation(): void {
    const alpha = this.interpolationAlpha;
    const bodies = this._bodies;

    const truePos = MathPool.acquireVector();
    const trueRot = MathPool.acquireVector();
    const blendPos = MathPool.acquireVector();
    const blendRot = MathPool.acquireVector();

    for (let i = 0; i < bodies.length; i++) {
      EulerIntegrator.interpolateTransform(bodies[i]!, alpha, truePos, trueRot, blendPos, blendRot);
    }

    MathPool.releaseVector(truePos);
    MathPool.releaseVector(trueRot);
    MathPool.releaseVector(blendPos);
    MathPool.releaseVector(blendRot);
  }

  private _internalStep(bodies: Object3D[], allColliders: Collidable[], dt: number): void {
    const deltaP = MathPool.acquireVector();

    for (const obj of bodies) {
      const rb = obj.rigidBody!;

      rb.prevPosition.copyFrom(obj.position);
      rb.prevRotation.copyFrom(obj.rotation);

      const fluidForces = BuoyancySolver.applyFluidForces(obj, this._fluidVolumes, this.gravity);

      EulerIntegrator.integrateVelocity(obj, this.gravity, fluidForces.linearDrag, dt, deltaP);

      this._ccd.checkCandidate(obj, deltaP, this.ccdMotionThreshold);

      EulerIntegrator.applyDisplacement(obj, deltaP);

      EulerIntegrator.integrateAngular(obj, fluidForces.angularDrag, dt);

      obj.updateMatrixWorld();
      obj.computeBounds();
      rb.clearForces();
    }

    MathPool.releaseVector(deltaP);

    this._resolveCollisions(bodies, allColliders);
  }

  private _resolveCollisions(bodies: Object3D[], allColliders: Collidable[]): void {
    this._broadphase.update(allColliders);

    if (this._ccd.hasCandidates) {
      this._ccd.resolve(this._broadphase);
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
      this._broadphase.queryVolume(dynObj.bounds, this._broadphaseQueryHits);

      for (let j = 0; j < this._broadphaseQueryHits.length; j++) {
        const otherObj = this._broadphaseQueryHits[j]!;
        if (dynObj === otherObj) continue;

        const otherAsBody: Object3D | undefined =
          otherObj instanceof Object3D ? otherObj : undefined;

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
          if (collisionFound) result.scale(-1);
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
          if (collisionFound) result.scale(-1);
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
          if (collisionFound) result.scale(-1);
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
              const correction = depth / totalInvMass;

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

              const velA = rbA.velocity;
              const velB = rbB ? rbB.velocity : MathPool.acquireVector().set(0, 0, 0);

              rv.copyFrom(velA).sub(velB);
              const velAlongNormal = rv.dot(normal);

              if (velAlongNormal < 0) {
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
