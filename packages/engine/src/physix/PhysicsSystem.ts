import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Vector3D, MathPool } from "../math/index.js";
import { Collision } from "./Collision.js";
import { EventDispatcherImpl } from "../core/events/EventDispatcherImpl.js";
import { Collidable } from "../interfaces/index.js";
import { BoundingType } from "../enums/index.js";
import { BoundingBox } from "./BoundingBox.js";
import { BoundingSphere } from "./BoundingSphere.js";
import { OBB } from "./OBB.js";
import { ConvexHull } from "./ConvexHull.js";
import { StaticCollider } from "./StaticCollider.js";
import { FluidVolume } from "./FluidVolume.js";
import { BuoyancySolver } from "./fluids/BuoyancySolver.js";
import { PhysicsBroadphase } from "./broadphase/PhysicsBroadphase.js";
import { SweptVolumeCCD } from "./ccd/SweptSphereCCD.js";
import { EulerIntegrator } from "./solvers/EulerIntegrator.js";
import { Ray } from "./Ray.js";
import { RaycastHit } from "./RaycastHit.js";
import { Joint } from "./joints/Joint.js";

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
   * Continuous Collision Detection (CCD) threshold, as a multiple of a body's broad radius.
   * Set to `Infinity` to disable CCD entirely.
   */
  public ccdMotionThreshold: number = 1.0;

  /** Active Physics Joints / Constraints tracked directly by the system. */
  public joints: Joint[] = [];

  private _accumulator: number = 0;
  private _bodies: Object3D[] = [];
  private _allColliders: Collidable[] = [];
  private _fluidVolumes: FluidVolume[] = [];
  private _allJoints: Joint[] = [];

  private _broadphase = new PhysicsBroadphase();
  private _ccd = new SweptVolumeCCD();
  private _broadphaseQueryHits: Collidable[] = [];
  private _warnedObjects = new Set<Object3D>();

  private _pairPool: {
    first: Collidable;
    second: Collidable;
    idA: number;
    idB: number;
    colliding: boolean;
    normal: Vector3D;
    depth: number;
  }[] = [];
  private _activePairs: {
    first: Collidable;
    second: Collidable;
    idA: number;
    idB: number;
    colliding: boolean;
    normal: Vector3D;
    depth: number;
  }[] = [];
  private _seenPairKeys = new Set<number>();
  private _collidableIdMap = new WeakMap<Collidable, number>();
  private _nextInternalId: number = 100000000;

  private _pairStatePool: {
    objectA: Collidable;
    objectB: Collidable;
    normal: Vector3D;
    depth: number;
    impulse: number;
  }[] = [];

  private _currentTriggerPairs = new Map<
    number,
    {
      objectA: Collidable;
      objectB: Collidable;
      normal: Vector3D;
      depth: number;
      impulse: number;
    }
  >();
  private _prevTriggerPairs = new Map<
    number,
    {
      objectA: Collidable;
      objectB: Collidable;
      normal: Vector3D;
      depth: number;
      impulse: number;
    }
  >();

  private _currentCollisionPairs = new Map<
    number,
    {
      objectA: Collidable;
      objectB: Collidable;
      normal: Vector3D;
      depth: number;
      impulse: number;
    }
  >();
  private _prevCollisionPairs = new Map<
    number,
    {
      objectA: Collidable;
      objectB: Collidable;
      normal: Vector3D;
      depth: number;
      impulse: number;
    }
  >();

  private _acquirePairState(): {
    objectA: Collidable;
    objectB: Collidable;
    normal: Vector3D;
    depth: number;
    impulse: number;
  } {
    const s = this._pairStatePool.pop();
    if (s) {
      s.depth = 0;
      s.impulse = 0;
      s.normal.set(0, 0, 0);
      return s;
    }
    return {
      objectA: undefined as unknown as Collidable,
      objectB: undefined as unknown as Collidable,
      normal: new Vector3D(),
      depth: 0,
      impulse: 0,
    };
  }

  private _releasePairState(state: {
    objectA: Collidable;
    objectB: Collidable;
    normal: Vector3D;
    depth: number;
    impulse: number;
  }): void {
    this._pairStatePool.push(state);
  }

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
  ): {
    first: Collidable;
    second: Collidable;
    idA: number;
    idB: number;
    colliding: boolean;
    normal: Vector3D;
    depth: number;
  } {
    const pair = this._pairPool.pop();
    if (pair) {
      pair.first = first;
      pair.second = second;
      pair.idA = idA;
      pair.idB = idB;
      pair.colliding = false;
      pair.normal.set(0, 0, 0);
      pair.depth = 0;
      return pair;
    }
    return {
      first,
      second,
      idA,
      idB,
      colliding: false,
      normal: new Vector3D(),
      depth: 0,
    };
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
  /**
   * Adds a joint to the physics simulation.
   */
  public addJoint(joint: Joint): void {
    if (!this.joints.includes(joint)) {
      this.joints.push(joint);
    }
  }

  /**
   * Removes a joint from the physics simulation.
   */
  public removeJoint(joint: Joint): boolean {
    const idx = this.joints.indexOf(joint);
    if (idx !== -1) {
      this.joints.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Clears all joints tracked by the system.
   */
  public clearJoints(): void {
    this.joints.length = 0;
  }

  /**
   * Advances the physics simulation for a given Scene by delta time `dt`.
   * Automatically executes fixed-timestep sub-steps to preserve determinism and numerical stability.
   * @param scene The scene containing objects with RigidBodies.
   * @param dt Delta time in seconds.
   */
  public step(scene: Scene, dt: number): void {
    if (dt <= 0) return;

    if (dt > this.maxDeltaTime) dt = this.maxDeltaTime;

    this._accumulator += dt;

    const bodies = this._bodies;
    const allColliders = this._allColliders;
    const allJoints = this._allJoints;
    bodies.length = 0;
    allColliders.length = 0;
    allJoints.length = 0;

    for (let i = 0; i < scene.objects.length; i++) {
      this._collectRecursive(scene.objects[i]!, bodies, allColliders);
    }

    for (let i = 0; i < scene.staticColliders.length; i++) {
      const c = scene.staticColliders[i]!;
      if (c.bounds) {
        allColliders.push(c);
      }
    }

    for (let i = 0; i < this.joints.length; i++) {
      allJoints.push(this.joints[i]!);
    }
    if (scene.joints) {
      for (let i = 0; i < scene.joints.length; i++) {
        allJoints.push(scene.joints[i]!);
      }
    }

    // Sort dynamic bodies deterministically by ID to ensure order-independent integration & CCD
    bodies.sort((a, b) => this.getColliderId(a) - this.getColliderId(b));

    let subSteps = 0;
    while (this._accumulator >= this.fixedTimeStep && subSteps < this.maxSubSteps) {
      this._internalStep(bodies, allColliders, allJoints, this.fixedTimeStep);
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

  private _internalStep(
    bodies: Object3D[],
    allColliders: Collidable[],
    allJoints: Joint[],
    dt: number,
  ): void {
    // 1. Accumulate continuous joint forces (e.g. Hookean springs)
    for (let i = 0; i < allJoints.length; i++) {
      const joint = allJoints[i]!;
      if (joint.enabled && !joint.isBroken) {
        joint.applyForces?.(dt);
      }
    }

    const deltaP = MathPool.acquireVector();

    for (let i = 0; i < bodies.length; i++) {
      const obj = bodies[i]!;
      const rb = obj.rigidBody!;

      if (rb.isSleeping) {
        continue;
      }

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

    this._resolveCollisions(bodies, allColliders, allJoints, dt);

    // Sleep evaluation at the end of substep (after integration and collision resolution)
    for (let i = 0; i < bodies.length; i++) {
      const obj = bodies[i]!;
      const rb = obj.rigidBody!;

      if (rb.allowSleep && !rb.isSleeping) {
        const linSq = rb.velocity.lengthSq();
        const angSq = rb.angularVelocity.lengthSq();
        const linThreshSq = rb.sleepLinearThreshold * rb.sleepLinearThreshold;
        const angThreshSq = rb.sleepAngularThreshold * rb.sleepAngularThreshold;

        if (linSq < linThreshSq && angSq < angThreshSq) {
          rb._sleepTimer += dt;
          if (rb._sleepTimer >= rb.sleepTimeThreshold) {
            rb.putToSleep();
            this.events.dispatchEvent("physics:sleep", { object: obj });
          }
        } else {
          rb._sleepTimer = 0;
        }
      }
    }
  }

  /** Number of iterative solver iterations per substep for stacking stability & constraint relaxation (default: 4). */
  public solverIterations: number = 4;

  private _syncObjectTransformAndBounds(obj: Object3D, posCorr: Vector3D): void {
    obj.position.add(posCorr);
    obj.updateMatrixWorld();
    if (obj.geometry) {
      obj.computeBounds();
    } else if (obj.bounds) {
      const b = obj.bounds;
      if (b.type === BoundingType.BOX) {
        const box = b as BoundingBox;
        box.min.add(posCorr);
        box.max.add(posCorr);
        box.center.add(posCorr);
      } else if (b.type === BoundingType.SPHERE) {
        const sphere = b as BoundingSphere;
        if (sphere.center !== obj.position) {
          sphere.center.add(posCorr);
        }
      } else if (b.type === BoundingType.OBB) {
        const obb = b as OBB;
        obb.center.add(posCorr);
      } else if (b.type === BoundingType.HULL) {
        const hull = b as ConvexHull;
        hull.transform(obj.worldMatrix);
      }
    }
  }

  private _resolveCollisions(
    bodies: Object3D[],
    allColliders: Collidable[],
    allJoints: Joint[] = this._allJoints,
    dt: number = this.fixedTimeStep,
  ): void {
    this._broadphase.update(allColliders);

    if (this._ccd.hasCandidates) {
      this._ccd.resolve(this._broadphase);
    }

    this._releasePairs();

    for (let i = 0; i < bodies.length; i++) {
      const dynObj = bodies[i]!;
      const rbDyn = dynObj.rigidBody;
      if (!dynObj.bounds || (rbDyn && rbDyn.isSleeping)) continue;

      this._broadphaseQueryHits.length = 0;
      this._broadphase.queryVolume(dynObj.bounds, this._broadphaseQueryHits);

      const idDyn = this.getColliderId(dynObj);

      for (let j = 0; j < this._broadphaseQueryHits.length; j++) {
        const otherObj = this._broadphaseQueryHits[j]!;
        if (dynObj === otherObj || !otherObj.bounds) continue;

        if (!PhysicsBroadphase.canCollide(dynObj, otherObj)) continue;

        let skipCollision = false;
        for (let k = 0; k < allJoints.length; k++) {
          const joint = allJoints[k]!;
          if (
            !joint.collideConnected &&
            ((joint.bodyA === dynObj && joint.bodyB === otherObj) ||
              (joint.bodyA === otherObj && joint.bodyB === dynObj))
          ) {
            skipCollision = true;
            break;
          }
        }
        if (skipCollision) continue;

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
    const posCorr = MathPool.acquireVector();
    const impulse = MathPool.acquireVector();
    const vt = MathPool.acquireVector();
    const relTangent = MathPool.acquireVector();
    const impulseT = MathPool.acquireVector();
    const contactPt = MathPool.acquireVector();
    const velA = MathPool.acquireVector();
    const velB = MathPool.acquireVector();

    const iterations = Math.max(1, this.solverIterations);

    for (let iter = 0; iter < iterations; iter++) {
      // Symmetric Gauss-Seidel: alternate forward and backward passes for bidirectional constraint propagation
      const isForward = iter % 2 === 0;
      const start = isForward ? 0 : this._activePairs.length - 1;
      const end = isForward ? this._activePairs.length : -1;
      const step = isForward ? 1 : -1;

      for (let i = start; i !== end; i += step) {
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

        if (!collisionFound) {
          pair.colliding = false;
          continue;
        }

        pair.colliding = true;
        const depth = result.length();
        if (depth > 0) {
          pair.depth = depth;
          pair.normal.copyFrom(result).scale(1.0 / depth);
        }

        // Wake up sleeping bodies upon physical impact with an active moving body
        if (iter === 0) {
          const curVelA = rbA ? rbA.velocity : zeroVel;
          const curVelB = rbB ? rbB.velocity : zeroVel;
          const gravStep = this.gravity.length() * this.fixedTimeStep;
          const moveThreshSq = Math.max(
            rbA ? rbA.sleepLinearThreshold * rbA.sleepLinearThreshold : 0.0025,
            gravStep * gravStep * 1.44,
          );
          const isMovingA =
            rbA !== undefined &&
            !rbA.isSleeping &&
            (curVelA.lengthSq() > moveThreshSq ||
              curVelA.x * curVelA.x + curVelA.z * curVelA.z > 1e-4);
          const isMovingB =
            rbB !== undefined &&
            !rbB.isSleeping &&
            (curVelB.lengthSq() > moveThreshSq ||
              curVelB.x * curVelB.x + curVelB.z * curVelB.z > 1e-4);

          if (rbA && rbA.isSleeping && isMovingB) {
            rbA.wakeUp();
            this.events.dispatchEvent("physics:wakeup", { object: firstObj });
          }
          if (rbB && rbB.isSleeping && isMovingA) {
            rbB.wakeUp();
            this.events.dispatchEvent("physics:wakeup", { object: secondObj });
          }
        }

        const isTriggerA = Boolean(
          first.isTrigger || (firstObj && (firstObj.isTrigger || rbA?.isTrigger || rbA?.isSensor)),
        );
        const isTriggerB = Boolean(
          second.isTrigger ||
          (secondObj && (secondObj.isTrigger || rbB?.isTrigger || rbB?.isSensor)),
        );
        const isTriggerPair = isTriggerA || isTriggerB;

        if (isTriggerPair) {
          pair.colliding = false;
          if (iter === 0) {
            const pairKey = pair.idA * 4294967296 + pair.idB;
            let state = this._currentTriggerPairs.get(pairKey);
            if (!state) {
              state = this._acquirePairState();
              this._currentTriggerPairs.set(pairKey, state);
            }
            state.objectA = (firstObj ?? secondObj)!;
            state.objectB = firstObj ? second : first;
            state.normal.copyFrom(pair.normal);
            state.depth = depth;

            if (!this._prevTriggerPairs.has(pairKey)) {
              this.events.dispatchEvent("physics:trigger-enter", {
                objectA: state.objectA,
                objectB: state.objectB,
                normal: pair.normal,
                depth: depth,
              });
            } else {
              this.events.dispatchEvent("physics:trigger-stay", {
                objectA: state.objectA,
                objectB: state.objectB,
                normal: pair.normal,
                depth: depth,
              });
            }

            this.events.dispatchEvent("physics:trigger", {
              objectA: state.objectA,
              objectB: state.objectB,
              normal: pair.normal,
              depth: depth,
            });
            this.events.dispatchEvent("physics:collision", {
              objectA: state.objectA,
              objectB: state.objectB,
              normal: pair.normal,
              depth: depth,
              impulse: 0,
            });
          }
          continue;
        }

        // 1. Position resolution (penetration separation)
        if (depth > 0) {
          const correction = depth / totalInvMass;

          if (invMassA > 0 && firstObj) {
            posCorr.copyFrom(pair.normal).scale(correction * invMassA);
            this._syncObjectTransformAndBounds(firstObj, posCorr);
          }

          if (invMassB > 0 && secondObj) {
            posCorr.copyFrom(pair.normal).scale(-correction * invMassB);
            this._syncObjectTransformAndBounds(secondObj, posCorr);
          }
        }

        if (!pair.colliding) continue;

        const normal = pair.normal;

        // Accurate contact point in world coordinates
        const centerA = firstObj ? firstObj.position : first.bounds!.center;
        const centerB = secondObj ? secondObj.position : second.bounds!.center;
        const volA = first.bounds!;
        const volB = second.bounds!;

        if (volA.type === BoundingType.SPHERE && volB.type === BoundingType.SPHERE) {
          const rA = (volA as BoundingSphere).radius;
          contactPt.set(
            centerA.x - normal.x * (rA - pair.depth * 0.5),
            centerA.y - normal.y * (rA - pair.depth * 0.5),
            centerA.z - normal.z * (rA - pair.depth * 0.5),
          );
        } else if (volA.type === BoundingType.SPHERE && volB.type === BoundingType.BOX) {
          const boxB = volB as BoundingBox;
          contactPt.set(
            Math.max(boxB.min.x, Math.min(centerA.x, boxB.max.x)),
            Math.max(boxB.min.y, Math.min(centerA.y, boxB.max.y)),
            Math.max(boxB.min.z, Math.min(centerA.z, boxB.max.z)),
          );
        } else if (volA.type === BoundingType.BOX && volB.type === BoundingType.SPHERE) {
          const boxA = volA as BoundingBox;
          contactPt.set(
            Math.max(boxA.min.x, Math.min(centerB.x, boxA.max.x)),
            Math.max(boxA.min.y, Math.min(centerB.y, boxA.max.y)),
            Math.max(boxA.min.z, Math.min(centerB.z, boxA.max.z)),
          );
        } else if (volA.type === BoundingType.BOX && volB.type === BoundingType.BOX) {
          const boxA = volA as BoundingBox;
          const boxB = volB as BoundingBox;
          contactPt.set(
            (Math.max(boxA.min.x, boxB.min.x) + Math.min(boxA.max.x, boxB.max.x)) * 0.5,
            (Math.max(boxA.min.y, boxB.min.y) + Math.min(boxA.max.y, boxB.max.y)) * 0.5,
            (Math.max(boxA.min.z, boxB.min.z) + Math.min(boxA.max.z, boxB.max.z)) * 0.5,
          );
        } else if (volA.type === BoundingType.SPHERE) {
          const rA = (volA as BoundingSphere).radius;
          contactPt.set(
            centerA.x - normal.x * (rA - pair.depth * 0.5),
            centerA.y - normal.y * (rA - pair.depth * 0.5),
            centerA.z - normal.z * (rA - pair.depth * 0.5),
          );
        } else if (volB.type === BoundingType.SPHERE) {
          const rB = (volB as BoundingSphere).radius;
          contactPt.set(
            centerB.x + normal.x * (rB - pair.depth * 0.5),
            centerB.y + normal.y * (rB - pair.depth * 0.5),
            centerB.z + normal.z * (rB - pair.depth * 0.5),
          );
        } else {
          contactPt.set(
            (centerA.x + centerB.x) * 0.5,
            (centerA.y + centerB.y) * 0.5,
            (centerA.z + centerB.z) * 0.5,
          );
        }

        // Lever arms rA = contactPt - centerA, rB = contactPt - centerB
        const rAx = contactPt.x - centerA.x;
        const rAy = contactPt.y - centerA.y;
        const rAz = contactPt.z - centerA.z;

        const rBx = contactPt.x - centerB.x;
        const rBy = contactPt.y - centerB.y;
        const rBz = contactPt.z - centerB.z;

        // Linear + angular contact velocities: v_contact = v + w x r
        const curVelA = rbA && invMassA > 0 ? rbA.velocity : zeroVel;
        const curVelB = rbB && invMassB > 0 ? rbB.velocity : zeroVel;

        const wA = rbA && invMassA > 0 ? rbA.angularVelocity : zeroVel;
        const wB = rbB && invMassB > 0 ? rbB.angularVelocity : zeroVel;

        const vRotAx = wA.y * rAz - wA.z * rAy;
        const vRotAy = wA.z * rAx - wA.x * rAz;
        const vRotAz = wA.x * rAy - wA.y * rAx;

        const vRotBx = wB.y * rBz - wB.z * rBy;
        const vRotBy = wB.z * rBx - wB.x * rBz;
        const vRotBz = wB.x * rBy - wB.y * rBx;

        velA.set(curVelA.x + vRotAx, curVelA.y + vRotAy, curVelA.z + vRotAz);
        velB.set(curVelB.x + vRotBx, curVelB.y + vRotBy, curVelB.z + vRotBz);

        rv.copyFrom(velA).sub(velB);
        const velAlongNormal = rv.dot(normal);

        // Rotational effective inverse mass terms for normal:
        let kRotN = 0;
        if (invMassA > 0 && rbA) {
          const tauNx = rAy * normal.z - rAz * normal.y;
          const tauNy = rAz * normal.x - rAx * normal.z;
          const tauNz = rAx * normal.y - rAy * normal.x;

          const dWx = tauNx * rbA.inverseInertiaTensor.x;
          const dWy = tauNy * rbA.inverseInertiaTensor.y;
          const dWz = tauNz * rbA.inverseInertiaTensor.z;

          const dVx = dWy * rAz - dWz * rAy;
          const dVy = dWz * rAx - dWx * rAz;
          const dVz = dWx * rAy - dWy * rAx;

          kRotN += dVx * normal.x + dVy * normal.y + dVz * normal.z;
        }

        if (invMassB > 0 && rbB) {
          const tauNx = rBy * normal.z - rBz * normal.y;
          const tauNy = rBz * normal.x - rBx * normal.z;
          const tauNz = rBx * normal.y - rBy * normal.x;

          const dWx = tauNx * rbB.inverseInertiaTensor.x;
          const dWy = tauNy * rbB.inverseInertiaTensor.y;
          const dWz = tauNz * rbB.inverseInertiaTensor.z;

          const dVx = dWy * rBz - dWz * rBy;
          const dVy = dWz * rBx - dWx * rBz;
          const dVz = dWx * rBy - dWy * rBx;

          kRotN += dVx * normal.x + dVy * normal.y + dVz * normal.z;
        }

        const effInvMassN = totalInvMass + kRotN;

        // 2. Velocity resolution (Normal Impulse with angular reaction)
        let jMag = 0;
        if (velAlongNormal < 0 && effInvMassN > 0) {
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
          const e = iter === 0 && velAlongNormal <= -0.5 ? Math.min(restA, restB) : 0;
          jMag = -(1 + e) * velAlongNormal;
          // Successive Over-Relaxation (SOR) factor (1.2) for fast convergence on stacked contacts
          const relaxation = iter > 0 ? 1.2 : 1.0;
          jMag = (jMag / effInvMassN) * relaxation;

          impulse.copyFrom(normal).scale(jMag);
          if (invMassA > 0 && rbA) {
            rbA.applyImpulseAtPoint(impulse, contactPt, centerA);
          }
          if (invMassB > 0 && rbB) {
            impulse.scale(-1);
            rbB.applyImpulseAtPoint(impulse, contactPt, centerB);
          }
        }

        // 3. Coulomb Contact Friction (with angular response)
        const postVelA = rbA && invMassA > 0 ? rbA.velocity : zeroVel;
        const postVelB = rbB && invMassB > 0 ? rbB.velocity : zeroVel;
        const postWA = rbA && invMassA > 0 ? rbA.angularVelocity : zeroVel;
        const postWB = rbB && invMassB > 0 ? rbB.angularVelocity : zeroVel;

        const pvRotAx = postWA.y * rAz - postWA.z * rAy;
        const pvRotAy = postWA.z * rAx - postWA.x * rAz;
        const pvRotAz = postWA.x * rAy - postWA.y * rAx;

        const pvRotBx = postWB.y * rBz - postWB.z * rBy;
        const pvRotBy = postWB.z * rBx - postWB.x * rBz;
        const pvRotBz = postWB.x * rBy - postWB.y * rBx;

        velA.set(postVelA.x + pvRotAx, postVelA.y + pvRotAy, postVelA.z + pvRotAz);
        velB.set(postVelB.x + pvRotBx, postVelB.y + pvRotBy, postVelB.z + pvRotBz);

        rv.copyFrom(velA).sub(velB);

        const vNormal = rv.dot(normal);
        vt.copyFrom(normal).scale(vNormal);
        relTangent.copyFrom(rv).sub(vt);
        const vtSpeed = relTangent.length();

        if (vtSpeed > 1e-4 && jMag > 0) {
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

          const tDirX = relTangent.x / vtSpeed;
          const tDirY = relTangent.y / vtSpeed;
          const tDirZ = relTangent.z / vtSpeed;

          let kRotT = 0;
          if (invMassA > 0 && rbA) {
            const tauTx = rAy * tDirZ - rAz * tDirY;
            const tauTy = rAz * tDirX - rAx * tDirZ;
            const tauTz = rAx * tDirY - rAy * tDirX;

            const dWx = tauTx * rbA.inverseInertiaTensor.x;
            const dWy = tauTy * rbA.inverseInertiaTensor.y;
            const dWz = tauTz * rbA.inverseInertiaTensor.z;

            const dVx = dWy * rAz - dWz * rAy;
            const dVy = dWz * rAx - dWx * rAz;
            const dVz = dWx * rAy - dWy * rAx;

            kRotT += dVx * tDirX + dVy * tDirY + dVz * tDirZ;
          }

          if (invMassB > 0 && rbB) {
            const tauTx = rBy * tDirZ - rBz * tDirY;
            const tauTy = rBz * tDirX - rBx * tDirZ;
            const tauTz = rBx * tDirY - rBy * tDirX;

            const dWx = tauTx * rbB.inverseInertiaTensor.x;
            const dWy = tauTy * rbB.inverseInertiaTensor.y;
            const dWz = tauTz * rbB.inverseInertiaTensor.z;

            const dVx = dWy * rBz - dWz * rBy;
            const dVy = dWz * rBx - dWx * rBz;
            const dVz = dWx * rBy - dWy * rBx;

            kRotT += dVx * tDirX + dVy * tDirY + dVz * tDirZ;
          }

          const effInvMassT = totalInvMass + kRotT;

          // Max tangential friction impulse allowed by Coulomb cone
          const maxFrictionImpulse = mu * jMag;
          // Ideal impulse to stop tangential sliding
          const idealFrictionImpulse = effInvMassT > 0 ? vtSpeed / effInvMassT : 0;
          const jFriction = Math.min(idealFrictionImpulse, maxFrictionImpulse);

          if (jFriction > 1e-8) {
            impulseT.set(-tDirX * jFriction, -tDirY * jFriction, -tDirZ * jFriction);
            if (invMassA > 0 && rbA) {
              rbA.applyImpulseAtPoint(impulseT, contactPt, centerA);
            }
            if (invMassB > 0 && rbB) {
              impulseT.scale(-1);
              rbB.applyImpulseAtPoint(impulseT, contactPt, centerB);
            }
          }
        }

        // 4. Dispatch collision event once on the first iteration
        if (iter === 0 && pair.colliding && (velAlongNormal < 0 || pair.depth > 0)) {
          const pairKey = pair.idA * 4294967296 + pair.idB;
          let state = this._currentCollisionPairs.get(pairKey);
          if (!state) {
            state = this._acquirePairState();
            this._currentCollisionPairs.set(pairKey, state);
          }
          state.objectA = (firstObj ?? secondObj)!;
          state.objectB = firstObj ? second : first;
          state.normal.copyFrom(normal);
          state.depth = pair.depth;
          state.impulse = jMag;

          if (!this._prevCollisionPairs.has(pairKey)) {
            this.events.dispatchEvent("physics:collision-enter", {
              objectA: state.objectA,
              objectB: state.objectB,
              normal: normal,
              depth: pair.depth,
              impulse: jMag,
            });
          } else {
            this.events.dispatchEvent("physics:collision-stay", {
              objectA: state.objectA,
              objectB: state.objectB,
              normal: normal,
              depth: pair.depth,
              impulse: jMag,
            });
          }

          this.events.dispatchEvent("physics:collision", {
            objectA: state.objectA,
            objectB: state.objectB,
            normal: normal,
            depth: pair.depth,
            impulse: jMag,
          });
        }
      }

      // Solve joint velocity constraints during each PGS iteration
      for (let k = 0; k < allJoints.length; k++) {
        const joint = allJoints[k]!;
        if (joint.enabled && !joint.isBroken) {
          joint.solveVelocity(dt);
        }
      }
    }

    // Solve post-solve position projection / drift compensation for joints
    for (let k = 0; k < allJoints.length; k++) {
      const joint = allJoints[k]!;
      if (joint.enabled && !joint.isBroken) {
        joint.solvePosition();
      }
    }

    // 5. Resting contact velocity stabilization: clamp small discrete gravity drift on settled bodies
    const gravitySpeed = this.gravity.length() * this.fixedTimeStep;
    const restThresholdSq = gravitySpeed * gravitySpeed * 1.5;

    for (let i = 0; i < this._activePairs.length; i++) {
      const pair = this._activePairs[i]!;
      if (!pair.colliding) continue;

      const firstObj = pair.first instanceof Object3D ? pair.first : undefined;
      const secondObj = pair.second instanceof Object3D ? pair.second : undefined;
      const rbA = firstObj?.rigidBody;
      const rbB = secondObj?.rigidBody;

      if (rbA && rbA.inverseMass > 0 && !rbA.isSleeping) {
        if (rbA.velocity.lengthSq() < restThresholdSq) {
          const vDotN = rbA.velocity.dot(pair.normal);
          if (Math.abs(vDotN) < gravitySpeed * 1.2) {
            rbA.velocity.x -= pair.normal.x * vDotN;
            rbA.velocity.y -= pair.normal.y * vDotN;
            rbA.velocity.z -= pair.normal.z * vDotN;
          }
        }
      }

      if (rbB && rbB.inverseMass > 0 && !rbB.isSleeping) {
        if (rbB.velocity.lengthSq() < restThresholdSq) {
          const vDotN = rbB.velocity.dot(pair.normal);
          if (Math.abs(vDotN) < gravitySpeed * 1.2) {
            rbB.velocity.x -= pair.normal.x * vDotN;
            rbB.velocity.y -= pair.normal.y * vDotN;
            rbB.velocity.z -= pair.normal.z * vDotN;
          }
        }
      }
    }

    // 6. Trigger & Collision Exit Events
    for (const [key, state] of this._prevTriggerPairs) {
      if (!this._currentTriggerPairs.has(key)) {
        this.events.dispatchEvent("physics:trigger-exit", {
          objectA: state.objectA,
          objectB: state.objectB,
        });
        this._releasePairState(state);
      }
    }
    this._prevTriggerPairs.clear();
    const tempTrig = this._prevTriggerPairs;
    this._prevTriggerPairs = this._currentTriggerPairs;
    this._currentTriggerPairs = tempTrig;

    for (const [key, state] of this._prevCollisionPairs) {
      if (!this._currentCollisionPairs.has(key)) {
        this.events.dispatchEvent("physics:collision-exit", {
          objectA: state.objectA,
          objectB: state.objectB,
        });
        this._releasePairState(state);
      }
    }
    this._prevCollisionPairs.clear();
    const tempColl = this._prevCollisionPairs;
    this._prevCollisionPairs = this._currentCollisionPairs;
    this._currentCollisionPairs = tempColl;

    MathPool.releaseVector(impulseT);
    MathPool.releaseVector(relTangent);
    MathPool.releaseVector(vt);
    MathPool.releaseVector(impulse);
    MathPool.releaseVector(posCorr);
    MathPool.releaseVector(zeroVel);
    MathPool.releaseVector(result);
    MathPool.releaseVector(rv);
  }

  /**
   * Resets and clears the broadphase tree, active pairs, and trigger/collision tracking state.
   */
  public clear(): void {
    this._broadphase.clear();
    this._releasePairs();
    for (const [, state] of this._prevTriggerPairs) {
      this._releasePairState(state);
    }
    this._prevTriggerPairs.clear();
    for (const [, state] of this._currentTriggerPairs) {
      this._releasePairState(state);
    }
    this._currentTriggerPairs.clear();
    for (const [, state] of this._prevCollisionPairs) {
      this._releasePairState(state);
    }
    this._prevCollisionPairs.clear();
    for (const [, state] of this._currentCollisionPairs) {
      this._releasePairState(state);
    }
    this._currentCollisionPairs.clear();
    this._bodies.length = 0;
    this._allColliders.length = 0;
    this._accumulator = 0;
  }

  /**
   * Casts a ray against all active colliders in the scene, returning the closest hit.
   * @param ray The ray to cast.
   * @param maxDistance Maximum travel distance (default: Infinity).
   * @param mask 32-bit collision layer mask filter (default: 0xFFFFFFFF).
   * @param outHit Optional RaycastHit object receiving the hit details.
   * @param ignoreTriggers If true, ignores sensor/trigger colliders (default: true).
   * @returns RaycastHit or null if nothing was hit within maxDistance.
   */
  public raycast(
    ray: Ray,
    maxDistance: number = Infinity,
    mask: number = 0xffffffff,
    outHit?: RaycastHit,
    ignoreTriggers: boolean = true,
  ): RaycastHit | null {
    this._broadphaseQueryHits.length = 0;
    this._broadphase.queryRay(ray, this._broadphaseQueryHits, mask);

    let closestT = maxDistance;
    let closestCollider: Collidable | null = null;
    const hitPt = MathPool.acquireVector();
    const hitNorm = MathPool.acquireVector();
    const bestPt = MathPool.acquireVector();
    const bestNorm = MathPool.acquireVector();

    for (let i = 0; i < this._broadphaseQueryHits.length; i++) {
      const c = this._broadphaseQueryHits[i]!;
      if (!c.bounds) continue;
      if (ignoreTriggers) {
        const isTrig = Boolean(
          c.isTrigger ||
          (c instanceof Object3D && (c.rigidBody?.isTrigger || c.rigidBody?.isSensor)),
        );
        if (isTrig) continue;
      }

      const t = ray.intersectVolumeDetailed(c.bounds, hitPt, hitNorm);
      if (t >= 0 && t <= closestT) {
        closestT = t;
        closestCollider = c;
        bestPt.copyFrom(hitPt);
        bestNorm.copyFrom(hitNorm);
      }
    }

    MathPool.releaseVector(hitPt);
    MathPool.releaseVector(hitNorm);

    if (closestCollider !== null && closestT <= maxDistance) {
      const hit = outHit ?? {
        distance: 0,
        point: new Vector3D(),
        normal: new Vector3D(),
        collider: closestCollider,
        ...(closestCollider instanceof Object3D ? { object: closestCollider } : {}),
      };
      hit.distance = closestT;
      hit.point.copyFrom(bestPt);
      hit.normal.copyFrom(bestNorm);
      hit.collider = closestCollider;
      if (closestCollider instanceof Object3D) {
        hit.object = closestCollider;
      } else {
        delete hit.object;
      }

      MathPool.releaseVector(bestPt);
      MathPool.releaseVector(bestNorm);
      return hit;
    }

    MathPool.releaseVector(bestPt);
    MathPool.releaseVector(bestNorm);
    return null;
  }

  /**
   * Casts a ray against all active colliders and returns all hits sorted by distance ascending.
   * @param ray The ray to cast.
   * @param maxDistance Maximum travel distance.
   * @param mask 32-bit collision layer mask filter.
   * @param outHits Optional array receiving the results.
   * @param ignoreTriggers If true, ignores sensor/trigger colliders.
   * @returns Array of RaycastHit objects sorted by distance ascending.
   */
  public raycastAll(
    ray: Ray,
    maxDistance: number = Infinity,
    mask: number = 0xffffffff,
    outHits?: RaycastHit[],
    ignoreTriggers: boolean = true,
  ): RaycastHit[] {
    const hits = outHits ?? [];
    hits.length = 0;

    this._broadphaseQueryHits.length = 0;
    this._broadphase.queryRay(ray, this._broadphaseQueryHits, mask);

    const hitPt = MathPool.acquireVector();
    const hitNorm = MathPool.acquireVector();

    for (let i = 0; i < this._broadphaseQueryHits.length; i++) {
      const c = this._broadphaseQueryHits[i]!;
      if (!c.bounds) continue;
      if (ignoreTriggers) {
        const isTrig = Boolean(
          c.isTrigger ||
          (c instanceof Object3D && (c.rigidBody?.isTrigger || c.rigidBody?.isSensor)),
        );
        if (isTrig) continue;
      }

      const t = ray.intersectVolumeDetailed(c.bounds, hitPt, hitNorm);
      if (t >= 0 && t <= maxDistance) {
        hits.push({
          distance: t,
          point: new Vector3D(hitPt.x, hitPt.y, hitPt.z),
          normal: new Vector3D(hitNorm.x, hitNorm.y, hitNorm.z),
          collider: c,
          ...(c instanceof Object3D ? { object: c } : {}),
        });
      }
    }

    MathPool.releaseVector(hitPt);
    MathPool.releaseVector(hitNorm);

    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }

  /**
   * Sweeps a sphere along a direction vector against all active colliders in the scene.
   * @param origin Starting center position of the swept sphere.
   * @param radius Radius of the sphere.
   * @param direction Direction vector of the sweep.
   * @param maxDistance Maximum travel distance along direction.
   * @param mask 32-bit collision layer mask filter (default: 0xFFFFFFFF).
   * @param outHit Optional RaycastHit object receiving the hit details.
   * @param ignoreTriggers If true, ignores sensor/trigger colliders (default: true).
   * @returns RaycastHit or null if no obstacle was struck.
   */
  public sphereCast(
    origin: Vector3D,
    radius: number,
    direction: Vector3D,
    maxDistance: number = Infinity,
    mask: number = 0xffffffff,
    outHit?: RaycastHit,
    ignoreTriggers: boolean = true,
  ): RaycastHit | null {
    const sweepSphere = new BoundingSphere(origin, radius);
    const delta = MathPool.acquireVector().copyFrom(direction);
    const dirLen = delta.length();
    const distanceLimit = Number.isFinite(maxDistance) ? maxDistance : 100000;
    if (dirLen > 1e-8) {
      delta.scale(distanceLimit / dirLen);
    }

    const sweptMin = MathPool.acquireVector().set(
      Math.min(origin.x, origin.x + delta.x) - radius,
      Math.min(origin.y, origin.y + delta.y) - radius,
      Math.min(origin.z, origin.z + delta.z) - radius,
    );
    const sweptMax = MathPool.acquireVector().set(
      Math.max(origin.x, origin.x + delta.x) + radius,
      Math.max(origin.y, origin.y + delta.y) + radius,
      Math.max(origin.z, origin.z + delta.z) + radius,
    );

    const sweptBox = new BoundingBox(sweptMin, sweptMax);
    this._broadphaseQueryHits.length = 0;
    this._broadphase.queryVolume(sweptBox, this._broadphaseQueryHits, mask);

    MathPool.releaseVector(sweptMin);
    MathPool.releaseVector(sweptMax);

    let earliestToi = 1.0;
    let closestCollider: Collidable | null = null;

    for (let i = 0; i < this._broadphaseQueryHits.length; i++) {
      const c = this._broadphaseQueryHits[i]!;
      if (!c.bounds) continue;
      if (ignoreTriggers) {
        const isTrig = Boolean(
          c.isTrigger ||
          (c instanceof Object3D && (c.rigidBody?.isTrigger || c.rigidBody?.isSensor)),
        );
        if (isTrig) continue;
      }

      const toi = Collision.sweep(sweepSphere, origin, delta, c.bounds);
      if (toi >= 0 && toi <= earliestToi) {
        earliestToi = toi;
        closestCollider = c;
      }
    }

    if (closestCollider !== null && earliestToi <= 1.0) {
      const hitDistance = earliestToi * distanceLimit;
      const hit = outHit ?? {
        distance: 0,
        point: new Vector3D(),
        normal: new Vector3D(),
        collider: closestCollider,
        ...(closestCollider instanceof Object3D ? { object: closestCollider } : {}),
      };
      hit.distance = hitDistance;
      hit.point.copyFrom(delta).scale(earliestToi).add(origin);
      hit.collider = closestCollider;
      if (closestCollider instanceof Object3D) {
        hit.object = closestCollider;
      } else {
        delete hit.object;
      }

      if (closestCollider.bounds) {
        hit.normal.copyFrom(hit.point).sub(closestCollider.bounds.center);
        const nLen = hit.normal.length();
        if (nLen > 1e-8) {
          hit.normal.scale(1.0 / nLen);
        } else {
          hit.normal.copyFrom(direction).scale(-1).normalize();
        }
      }

      MathPool.releaseVector(delta);
      return hit;
    }

    MathPool.releaseVector(delta);
    return null;
  }
}
