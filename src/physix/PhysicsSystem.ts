import { Object3D } from "../core/Object3D.js";
import { Scene } from "../core/Scene.js";
import { Octree } from "../core/Octree.js";
import { Vector3D, MathPool, MathUtils } from "../math/index.js";
import { Collision } from "./Collision.js";
import { BoundingSphere } from "./BoundingSphere.js";
import { BoundingBox } from "./BoundingBox.js";
import { OBB } from "./OBB.js";
import { EventDispatcherImpl } from "../core/events/EventDispatcherImpl.js";
import { Collidable, BoundingVolume } from "../interfaces/index.js";
import { BoundingType } from "../enums/index.js";
import { FluidVolume } from "./FluidVolume.js";

/** Padding added to the computed world AABB to guard against boundary floating-point edge cases. */
const BROADPHASE_EPSILON: number = 0.01;

/**
 * How far past the exact contact point a CCD-corrected body is allowed to advance, as a
 * fraction of its per-substep displacement. A small overshoot (rather than stopping exactly at
 * the surface) guarantees the discrete resolver sees genuine, if tiny, penetration depth right
 * away, so the impulse/bounce response happens in the same substep instead of one frame late.
 */
const CCD_CONTACT_OVERSHOOT: number = 0.01;

/**
 * A sphere-shaped dynamic body flagged during integration as moving fast enough (relative to
 * its own radius) this substep that it could tunnel through thin/small geometry before the
 * discrete narrow-phase ever sees an overlap. Resolved via a swept test in `_resolveCCD` before
 * the normal discrete collision pass runs.
 */
interface CCDCandidate {
  obj: Object3D;
  prevPos: Vector3D;
  delta: Vector3D;
  radius: number;
}

/**
 * Shortest-path angular delta from `from` to `to` (radians, wrapped into (-PI, PI]). Used to
 * render-interpolate Euler rotations without spinning the long way around whenever an angle
 * wraps past +-PI between two physics states.
 */
function shortestAngleDelta(from: number, to: number): number {
  let delta = (to - from) % MathUtils.TWO_PI;
  if (delta > MathUtils.PI) delta -= MathUtils.TWO_PI;
  else if (delta < -MathUtils.PI) delta += MathUtils.TWO_PI;
  return delta;
}

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
  /**
   * Continuous Collision Detection (CCD) threshold, as a multiple of a sphere body's own radius.
   * If a sphere-shaped body moves farther than `radius * ccdMotionThreshold` in a single
   * substep, it's swept against nearby geometry instead of only being checked for overlap at its
   * new position -- this catches fast/small bodies that would otherwise tunnel straight through
   * thin walls or other small colliders. Sphere bodies only, see
   * `docs/adr/0005-ccd-sphere-only-scope.md`. Set to `Infinity` to disable CCD entirely.
   */
  public ccdMotionThreshold: number = 1.0;

  private _accumulator: number = 0;
  private _ccdCandidates: CCDCandidate[] = [];
  private _ccdQueryHits: Collidable[] = [];

  private _bodies: Object3D[] = [];
  private _allColliders: Collidable[] = [];
  private _fluidVolumes: FluidVolume[] = [];
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
  // Reused by `_resolveCCD` instead of allocating a fresh BoundingBox per CCD candidate per
  // substep -- only `min`/`max` are read by `Octree.queryVolume`'s frustum/bounds tests.
  private _ccdScratchBox: BoundingBox = new BoundingBox(new Vector3D(), new Vector3D());
  private _bodyIndex = new Map<Object3D, number>();
  private _broadphaseFallback: Collidable[] = [];
  private _broadphaseQueryHits: Collidable[] = [];

  private _warnedObjects = new Set<Object3D>();

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

  /**
   * How far the accumulator has progressed into the next, not-yet-simulated fixed timestep, as
   * a fraction in [0, 1). Used by `applyRenderInterpolation` to blend each body's rendered
   * transform between its previous and current physics state.
   */
  public get interpolationAlpha(): number {
    return this._accumulator / this.fixedTimeStep;
  }

  /**
   * Renders every tracked rigid body's transform interpolated between its previous and current
   * fixed-timestep physics state, instead of snapping to the latest completed substep -- this is
   * what actually eliminates visual stutter when the render framerate doesn't line up evenly
   * with `fixedTimeStep` (see "Fix Your Timestep!" in `REFERENCES.md`).
   *
   * Must be called once per frame, after anything that depends on the *true* physics transform
   * (collision bounds, frustum culling, gameplay logic) and immediately before rendering: each
   * object's true position/rotation is restored right after its interpolated world matrix is
   * computed, so nothing else ever observes the interpolated (render-only) state.
   */
  public applyRenderInterpolation(): void {
    const alpha = this.interpolationAlpha;
    const bodies = this._bodies;

    const truePos = MathPool.acquireVector();
    const trueRot = MathPool.acquireVector();
    const blendPos = MathPool.acquireVector();
    const blendRot = MathPool.acquireVector();

    for (let i = 0; i < bodies.length; i++) {
      const obj = bodies[i]!;
      const rb = obj.rigidBody!;

      truePos.copyFrom(obj.position);
      trueRot.copyFrom(obj.rotation);

      blendPos.copyFrom(rb.prevPosition).lerp(truePos, alpha);
      blendRot.set(
        rb.prevRotation.x + shortestAngleDelta(rb.prevRotation.x, trueRot.x) * alpha,
        rb.prevRotation.y + shortestAngleDelta(rb.prevRotation.y, trueRot.y) * alpha,
        rb.prevRotation.z + shortestAngleDelta(rb.prevRotation.z, trueRot.z) * alpha,
      );

      obj.position.copyFrom(blendPos);
      obj.rotation.copyFrom(blendRot);
      obj.updateMatrixWorld();

      // Restore the true state -- next frame's physics step and `Scene.update()` must both
      // keep integrating/rebuilding from the real simulation state, not this render-only blend.
      obj.position.copyFrom(truePos);
      obj.rotation.copyFrom(trueRot);
    }

    MathPool.releaseVector(truePos);
    MathPool.releaseVector(trueRot);
    MathPool.releaseVector(blendPos);
    MathPool.releaseVector(blendRot);
  }

  private _internalStep(bodies: Object3D[], allColliders: Collidable[], dt: number): void {
    // 2. Integration Step (Semi-Implicit Euler)
    for (const obj of bodies) {
      const rb = obj.rigidBody!;

      // Snapshot the pre-substep state for render interpolation (see `applyRenderInterpolation`)
      // before anything below mutates `obj.position`/`obj.rotation`.
      rb.prevPosition.copyFrom(obj.position);
      rb.prevRotation.copyFrom(obj.rotation);

      let fluidLinearDrag = 1.0;
      let fluidAngularDrag = 1.0;

      if (obj.bounds && this._fluidVolumes.length > 0) {
        const boundsA = obj.bounds;
        let submergedRatioTotal = 0;
        let maxDensity = 0;
        let maxDrag = 1.0;
        let flowX = 0,
          flowY = 0,
          flowZ = 0;

        for (let i = 0; i < this._fluidVolumes.length; i++) {
          const fv = this._fluidVolumes[i]!;
          if (fv.bounds.intersectsVolume(boundsA)) {
            let aabbMinY, aabbMaxY;
            if (boundsA.type === BoundingType.BOX) {
              aabbMinY = (boundsA as BoundingBox).min.y;
              aabbMaxY = (boundsA as BoundingBox).max.y;
            } else if (boundsA.type === BoundingType.SPHERE) {
              aabbMinY = boundsA.center.y - (boundsA as BoundingSphere).radius;
              aabbMaxY = boundsA.center.y + (boundsA as BoundingSphere).radius;
            } else {
              const br = boundsA.getBroadRadius();
              aabbMinY = boundsA.center.y - br;
              aabbMaxY = boundsA.center.y + br;
            }

            const waterTop = fv.bounds.max.y;
            if (aabbMinY < waterTop) {
              const objectHeight = Math.max(0.001, aabbMaxY - aabbMinY);
              const submergedDepth = Math.max(0, waterTop - aabbMinY);
              const ratio = Math.min(1.0, submergedDepth / objectHeight);

              if (ratio > submergedRatioTotal) {
                submergedRatioTotal = ratio;
                maxDensity = fv.density;
                maxDrag = fv.drag;
                flowX = fv.currentVelocity.x;
                flowY = fv.currentVelocity.y;
                flowZ = fv.currentVelocity.z;
              }
            }
          }
        }

        if (submergedRatioTotal > 0 && rb.inverseMass > 0) {
          const mass = 1.0 / rb.inverseMass;
          const buoyForceY = -this.gravity.y * mass * maxDensity * submergedRatioTotal;
          rb.forces.y += buoyForceY;

          if (flowX !== 0 || flowY !== 0 || flowZ !== 0) {
            const flowForceFactor = submergedRatioTotal * 5.0 * mass;
            rb.forces.x += (flowX - rb.velocity.x) * flowForceFactor;
            rb.forces.y += (flowY - rb.velocity.y) * flowForceFactor;
            rb.forces.z += (flowZ - rb.velocity.z) * flowForceFactor;
          }

          fluidLinearDrag = 1.0 - (1.0 - maxDrag) * submergedRatioTotal;
          fluidAngularDrag = fluidLinearDrag;
        }
      }

      // acceleration = (forces / mass) + gravity
      rb.acceleration.copyFrom(rb.forces).scale(rb.inverseMass).add(this.gravity);

      // Semi-Implicit Euler: Update velocity first, then position
      // v = v + a * dt
      const deltaV = MathPool.acquireVector().copyFrom(rb.acceleration).scale(dt);
      rb.velocity.add(deltaV);
      MathPool.releaseVector(deltaV);

      // Apply Friction/Damping (simple approach)
      rb.velocity.scale(rb.friction * fluidLinearDrag);

      // p = p + v * dt
      const deltaP = MathPool.acquireVector().copyFrom(rb.velocity).scale(dt);

      // CCD candidate check: only sphere bodies are swept (see `ccdMotionThreshold`'s doc).
      // Must read `obj.bounds` here, before `computeBounds()` below overwrites it with the
      // post-move state -- at this point it still holds the pre-move sphere.
      if (
        obj.bounds &&
        BoundingType.SPHERE === obj.bounds.type &&
        Number.isFinite(this.ccdMotionThreshold)
      ) {
        const radius = (obj.bounds as BoundingSphere).radius;
        const threshold = radius * this.ccdMotionThreshold;
        if (deltaP.lengthSq() > threshold * threshold) {
          this._ccdCandidates.push({
            obj,
            prevPos: MathPool.acquireVector().copyFrom(obj.position),
            delta: MathPool.acquireVector().copyFrom(deltaP),
            radius,
          });
        }
      }

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
      rb.angularVelocity.scale(rb.angularDamping * fluidAngularDrag);

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

  /**
   * Resolves this substep's CCD candidates (see `ccdMotionThreshold`'s doc) by sweeping each
   * one against nearby colliders in `broadphaseTree` and clamping its position to just past the
   * earliest impact along its path, instead of leaving it at its fully-integrated (and possibly
   * tunneled-through) position. Only ever corrects position -- velocity/rotation are untouched
   * here, so the discrete pass right after this naturally sees a genuinely (if barely)
   * overlapping pair and resolves the actual bounce/impulse/event exactly as it always does.
   */
  private _resolveCCD(broadphaseTree: Octree): void {
    for (let i = 0; i < this._ccdCandidates.length; i++) {
      const candidate = this._ccdCandidates[i]!;
      const { obj, prevPos, delta, radius } = candidate;

      const sweptMin = MathPool.acquireVector().set(
        Math.min(prevPos.x, prevPos.x + delta.x) - radius,
        Math.min(prevPos.y, prevPos.y + delta.y) - radius,
        Math.min(prevPos.z, prevPos.z + delta.z) - radius,
      );
      const sweptMax = MathPool.acquireVector().set(
        Math.max(prevPos.x, prevPos.x + delta.x) + radius,
        Math.max(prevPos.y, prevPos.y + delta.y) + radius,
        Math.max(prevPos.z, prevPos.z + delta.z) + radius,
      );
      // Collision.test()'s broad-phase check reads .center directly, so it must stay in sync
      // with .min/.max -- not just informational like the sweep-only scratch box in Collision.ts.
      this._ccdScratchBox.min.copyFrom(sweptMin);
      this._ccdScratchBox.max.copyFrom(sweptMax);
      this._ccdScratchBox.center.copyFrom(sweptMin).add(sweptMax).scale(0.5);

      this._ccdQueryHits.length = 0;
      broadphaseTree.queryVolume(this._ccdScratchBox, this._ccdQueryHits);
      for (let f = 0; f < this._broadphaseFallback.length; f++) {
        this._ccdQueryHits.push(this._broadphaseFallback[f]!);
      }
      MathPool.releaseVector(sweptMin);
      MathPool.releaseVector(sweptMax);

      let earliestToi = 1;
      for (let j = 0; j < this._ccdQueryHits.length; j++) {
        const other = this._ccdQueryHits[j]!;
        if (other === obj || !other.bounds) continue;

        let toi = -1;
        if (BoundingType.SPHERE === other.bounds.type) {
          toi = Collision.sweepSphereSphere(prevPos, delta, radius, other.bounds as BoundingSphere);
        } else if (BoundingType.BOX === other.bounds.type) {
          toi = Collision.sweepSphereBox(prevPos, delta, radius, other.bounds as BoundingBox);
        } else if (BoundingType.OBB === other.bounds.type) {
          toi = Collision.sweepSphereObb(prevPos, delta, radius, other.bounds as unknown as OBB);
        }

        if (toi >= 0 && toi < earliestToi) {
          earliestToi = toi;
        }
      }

      if (earliestToi < 1) {
        // Advance slightly *past* the exact contact point rather than stopping exactly on it --
        // otherwise the discrete resolver right below would see zero penetration depth and skip
        // the bounce/impulse response for this substep entirely.
        const clampedToi = Math.min(1, earliestToi + CCD_CONTACT_OVERSHOOT);
        obj.position.copyFrom(delta).scale(clampedToi).add(prevPos);
        obj.updateMatrixWorld();
        obj.computeBounds();
      }

      MathPool.releaseVector(prevPos);
      MathPool.releaseVector(delta);
    }

    this._ccdCandidates.length = 0;
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

    // CCD must run against this same, fully-populated tree, and before the discrete pass below
    // so it sees corrected (non-tunneled) positions for any bodies that needed a correction.
    if (this._ccdCandidates.length > 0) {
      this._resolveCCD(broadphaseTree);
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
