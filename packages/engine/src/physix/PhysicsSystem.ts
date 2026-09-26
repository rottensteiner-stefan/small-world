import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D, MathPool } from "../math/index.js";
import { Collision } from "./Collision.js";
import { EventDispatcherImpl } from "../core/events/EventDispatcherImpl.js";
import { Collidable } from "../interfaces/index.js";
import { StaticCollider } from "./StaticCollider.js";
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
  private _broadphaseQueryHits: Collidable[] = [];
  private _warnedObjects = new Set<Object3D>();

  private _pairPool: { first: Collidable; second: Collidable; idA: number; idB: number }[] = [];
  private _activePairs: { first: Collidable; second: Collidable; idA: number; idB: number }[] = [];
  private _seenPairKeys = new Set<number>();
  private _collidableIdMap = new WeakMap<Collidable, number>();
  private _nextInternalId: number = 100000000;

  /**
   * Returns a stable integer ID for any Collidable object.
   * Uses `collider.id` if defined, or assigns a stable internal ID.
   */
  public getColliderId(collider: Collidable): number {
    if (collider.id !== undefined) return collider.id;
    let id = this._collidableIdMap.get(collider);
    if (id === undefined) {
      id = this._nextInternalId++;
      this._collidableIdMap.set(collider, id);
    }
    return id;
  }

  private _acquirePair(
    first: Collidable,
    second: Collidable,
    idA: number,
    idB: number,
  ): { first: Collidable; second: Collidable; idA: number; idB: number } {
    const pair = this._pairPool.pop();
    if (pair) {
      pair.first = first;
      pair.second = second;
      pair.idA = idA;
      pair.idB = idB;
      return pair;
    }
    return { first, second, idA, idB };
  }

  private _releasePairs(): void {
    for (let i = 0; i < this._activePairs.length; i++) {
      this._pairPool.push(this._activePairs[i]!);
    }
    this._activePairs.length = 0;
    this._seenPairKeys.clear();
  }

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

    // Sort dynamic bodies deterministically by ID to ensure order-independent integration & CCD
    bodies.sort((a, b) => this.getColliderId(a) - this.getColliderId(b));

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

    this._releasePairs();

    for (let i = 0; i < bodies.length; i++) {
      const dynObj = bodies[i]!;
      if (!dynObj.bounds) continue;

      this._broadphaseQueryHits.length = 0;
      this._broadphase.queryVolume(dynObj.bounds, this._broadphaseQueryHits);

      const idDyn = this.getColliderId(dynObj);

      for (let j = 0; j < this._broadphaseQueryHits.length; j++) {
        const otherObj = this._broadphaseQueryHits[j]!;
        if (dynObj === otherObj || !otherObj.bounds) continue;

        const idOther = this.getColliderId(otherObj);
        if (idDyn === idOther) continue;

        const idA = idDyn < idOther ? idDyn : idOther;
        const idB = idDyn < idOther ? idOther : idDyn;
        const first = idDyn < idOther ? dynObj : otherObj;
        const second = idDyn < idOther ? otherObj : dynObj;

        // 64-bit pair key: zero allocations, bit-exact pairing up to 4 billion entities
        const pairKey = idA * 4294967296 + idB;
        if (this._seenPairKeys.has(pairKey)) continue;
        this._seenPairKeys.add(pairKey);

        this._activePairs.push(this._acquirePair(first, second, idA, idB));
      }
    }

    // Deterministic canonical sorting by (idA, idB)
    this._activePairs.sort((p1, p2) => (p1.idA !== p2.idA ? p1.idA - p2.idA : p1.idB - p2.idB));

    const result = MathPool.acquireVector();
    const rv = MathPool.acquireVector();
    const zeroVel = MathPool.acquireVector().set(0, 0, 0);

    for (let i = 0; i < this._activePairs.length; i++) {
      const pair = this._activePairs[i]!;
      const first = pair.first;
      const second = pair.second;

      const firstObj = first instanceof Object3D ? first : undefined;
      const secondObj = second instanceof Object3D ? second : undefined;

      const rbA = firstObj?.rigidBody;
      const rbB = secondObj?.rigidBody;

      const invMassA = rbA && rbA.inverseMass > 0 ? rbA.inverseMass : 0;
      const invMassB = rbB && rbB.inverseMass > 0 ? rbB.inverseMass : 0;
      const totalInvMass = invMassA + invMassB;

      // Skip static-static collisions
      if (totalInvMass <= 0) continue;

      const collisionFound = Collision.resolve(first.bounds!, second.bounds!, result);

      if (collisionFound) {
        const depth = result.length();
        if (depth > 0) {
          const normal = result.scale(1.0 / depth);

          if ((rbA && rbA.isSensor) || (rbB && rbB.isSensor)) {
            this.events.dispatchEvent("physics:collision", {
              objectA: (firstObj ?? secondObj)!,
              objectB: firstObj ? second : first,
              normal: normal,
              depth: depth,
              impulse: 0,
            });
            continue;
          }

          const correction = depth / totalInvMass;

          if (invMassA > 0 && firstObj) {
            const posCorrA = MathPool.acquireVector()
              .copyFrom(normal)
              .scale(correction * invMassA);
            firstObj.position.add(posCorrA);
            firstObj.updateMatrixWorld();
            MathPool.releaseVector(posCorrA);
          }

          if (invMassB > 0 && secondObj) {
            const posCorrB = MathPool.acquireVector()
              .copyFrom(normal)
              .scale(-correction * invMassB);
            secondObj.position.add(posCorrB);
            secondObj.updateMatrixWorld();
            MathPool.releaseVector(posCorrB);
          }

          const velA = rbA && invMassA > 0 ? rbA.velocity : zeroVel;
          const velB = rbB && invMassB > 0 ? rbB.velocity : zeroVel;

          rv.copyFrom(velA).sub(velB);
          const velAlongNormal = rv.dot(normal);

          if (velAlongNormal < 0) {
            const restA = rbA
              ? rbA.restitution
              : first instanceof StaticCollider
                ? first.restitution
                : 0.2;
            const restB = rbB
              ? rbB.restitution
              : second instanceof StaticCollider
                ? second.restitution
                : 0.2;
            const e = velAlongNormal > -0.5 ? 0 : Math.min(restA, restB);
            let jMag = -(1 + e) * velAlongNormal;
            jMag /= totalInvMass;

            const impulse = MathPool.acquireVector().copyFrom(normal).scale(jMag);
            if (invMassA > 0 && rbA) {
              rbA.applyImpulse(impulse);
            }
            if (invMassB > 0 && rbB) {
              impulse.scale(-1);
              rbB.applyImpulse(impulse);
            }
            MathPool.releaseVector(impulse);

            // 2. Coulomb Contact Friction (tangential grip & dynamic sliding resistance)
            const curVelA = rbA && invMassA > 0 ? rbA.velocity : zeroVel;
            const curVelB = rbB && invMassB > 0 ? rbB.velocity : zeroVel;
            rv.copyFrom(curVelA).sub(curVelB);

            const vNormal = rv.dot(normal);
            const vt = MathPool.acquireVector().copyFrom(normal).scale(vNormal);
            const relTangent = MathPool.acquireVector().copyFrom(rv).sub(vt);
            const vtSpeed = relTangent.length();

            if (vtSpeed > 1e-4) {
              const frictA = rbA
                ? rbA.friction
                : first instanceof StaticCollider
                  ? first.friction
                  : 0.5;
              const frictB = rbB
                ? rbB.friction
                : second instanceof StaticCollider
                  ? second.friction
                  : 0.5;
              const mu = Math.sqrt(Math.max(0, frictA) * Math.max(0, frictB));

              // Max tangential friction impulse allowed by Coulomb cone
              const maxFrictionImpulse = mu * jMag;
              // Ideal impulse to stop tangential sliding
              const idealFrictionImpulse = vtSpeed / totalInvMass;
              const jFriction = Math.min(idealFrictionImpulse, maxFrictionImpulse);

              // Friction opposes relative tangential velocity
              const impulseT = MathPool.acquireVector()
                .copyFrom(relTangent)
                .scale(-jFriction / vtSpeed);
              if (invMassA > 0 && rbA) {
                rbA.applyImpulse(impulseT);
              }
              if (invMassB > 0 && rbB) {
                impulseT.scale(-1);
                rbB.applyImpulse(impulseT);
              }
              MathPool.releaseVector(impulseT);
            }

            MathPool.releaseVector(vt);
            MathPool.releaseVector(relTangent);

            this._collisionEvent.objectA = (firstObj ?? secondObj)!;
            this._collisionEvent.objectB = firstObj ? second : first;
            this._collisionEvent.impulse = jMag;
            this.events.dispatchEvent("physics:collision", {
              objectA: (firstObj ?? secondObj)!,
              objectB: firstObj ? second : first,
              normal: normal,
              depth: depth,
              impulse: jMag,
            });
          }
        }
      }
    }

    MathPool.releaseVector(zeroVel);
    MathPool.releaseVector(result);
    MathPool.releaseVector(rv);
  }
}
