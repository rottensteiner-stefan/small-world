import { Object3D } from "../../core/Object3D.js";
import { Vector3D, MathPool } from "../../math/index.js";
import { Collidable } from "../../interfaces/index.js";
import { BoundingType } from "../../enums/index.js";
import { BoundingBox } from "../BoundingBox.js";
import { BoundingSphere } from "../BoundingSphere.js";
import { OBB } from "../OBB.js";
import { Collision } from "../Collision.js";
import { PhysicsBroadphase } from "../broadphase/PhysicsBroadphase.js";

/**
 * How far past the exact contact point a CCD-corrected body is allowed to advance, as a
 * fraction of its per-substep displacement.
 */
const CCD_CONTACT_OVERSHOOT: number = 0.01;

export interface CCDCandidate {
  obj: Object3D;
  prevPos: Vector3D;
  delta: Vector3D;
  radius: number;
}

/**
 * Handles Continuous Collision Detection (CCD) for fast-moving sphere colliders to prevent tunneling.
 */
export class SweptSphereCCD {
  private _candidates: CCDCandidate[] = [];
  private _queryHits: Collidable[] = [];
  private _scratchBox: BoundingBox = new BoundingBox(new Vector3D(), new Vector3D());

  /** Returns true if any fast-moving sphere bodies were registered in the current substep. */
  public get hasCandidates(): boolean {
    return this._candidates.length > 0;
  }

  /**
   * Tests whether a moving body exceeds the motion threshold and should be registered for swept CCD.
   * @param obj The dynamic Object3D.
   * @param deltaP Positional displacement vector for this substep.
   * @param ccdMotionThreshold Multiplier of radius triggering CCD.
   */
  public checkCandidate(obj: Object3D, deltaP: Vector3D, ccdMotionThreshold: number): void {
    if (
      obj.bounds &&
      BoundingType.SPHERE === obj.bounds.type &&
      Number.isFinite(ccdMotionThreshold)
    ) {
      const radius = (obj.bounds as BoundingSphere).radius;
      const threshold = radius * ccdMotionThreshold;
      if (deltaP.lengthSq() > threshold * threshold) {
        this._candidates.push({
          obj,
          prevPos: MathPool.acquireVector().copyFrom(obj.position),
          delta: MathPool.acquireVector().copyFrom(deltaP),
          radius,
        });
      }
    }
  }

  /**
   * Sweeps all registered CCD candidates against nearby colliders and clamps their positions to earliest impact.
   * @param broadphase The active physics broadphase structure.
   */
  public resolve(broadphase: PhysicsBroadphase): void {
    for (let i = 0; i < this._candidates.length; i++) {
      const candidate = this._candidates[i]!;
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

      this._scratchBox.min.copyFrom(sweptMin);
      this._scratchBox.max.copyFrom(sweptMax);
      this._scratchBox.center.copyFrom(sweptMin).add(sweptMax).scale(0.5);

      this._queryHits.length = 0;
      broadphase.queryVolume(this._scratchBox, this._queryHits);

      MathPool.releaseVector(sweptMin);
      MathPool.releaseVector(sweptMax);

      let earliestToi = 1;
      for (let j = 0; j < this._queryHits.length; j++) {
        const other = this._queryHits[j]!;
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
        const clampedToi = Math.min(1, earliestToi + CCD_CONTACT_OVERSHOOT);
        obj.position.copyFrom(delta).scale(clampedToi).add(prevPos);
        obj.updateMatrixWorld();
        obj.computeBounds();
      }

      MathPool.releaseVector(prevPos);
      MathPool.releaseVector(delta);
    }

    this._candidates.length = 0;
  }
}
