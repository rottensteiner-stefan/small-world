import { Octree } from "../../core/Octree.js";
import { Vector3D } from "../../math/index.js";
import { Collidable, BoundingVolume } from "../../interfaces/index.js";
import { BoundingBox } from "../BoundingBox.js";

/** Padding added to the computed world AABB to guard against boundary floating-point edge cases. */
const BROADPHASE_EPSILON: number = 0.01;

/**
 * Manages the Octree spatial acceleration structure and fallback collider tracking for physics broadphase.
 */
export class PhysicsBroadphase {
  private _tree?: Octree;
  private _worldMin: Vector3D = new Vector3D();
  private _worldMax: Vector3D = new Vector3D();
  private _fallback: Collidable[] = [];

  /** Returns the underlying Octree structure, if initialized. */
  public get tree(): Octree | undefined {
    return this._tree;
  }

  /** Returns uninserted colliders that fall back to brute-force checking. */
  public get fallback(): readonly Collidable[] {
    return this._fallback;
  }

  /**
   * Expands the running world AABB to include a collider's bounding volume.
   */
  private _trackColliderBounds(bounds: BoundingVolume): void {
    const r = bounds.getBroadRadius();
    const cx = bounds.center.x;
    const cy = bounds.center.y;
    const cz = bounds.center.z;

    if (cx - r < this._worldMin.x) this._worldMin.x = cx - r;
    if (cy - r < this._worldMin.y) this._worldMin.y = cy - r;
    if (cz - r < this._worldMin.z) this._worldMin.z = cz - r;

    if (cx + r > this._worldMax.x) this._worldMax.x = cx + r;
    if (cy + r > this._worldMax.y) this._worldMax.y = cy + r;
    if (cz + r > this._worldMax.z) this._worldMax.z = cz + r;
  }

  /**
   * Rebuilds the Octree broadphase structure with all scene colliders.
   * @param allColliders Array of all collidable entities.
   */
  public update(allColliders: readonly Collidable[]): void {
    this._worldMin.set(Infinity, Infinity, Infinity);
    this._worldMax.set(-Infinity, -Infinity, -Infinity);

    for (let i = 0; i < allColliders.length; i++) {
      const collider = allColliders[i]!;
      if (collider.bounds) {
        this._trackColliderBounds(collider.bounds);
      }
    }

    this._worldMin.x -= BROADPHASE_EPSILON;
    this._worldMin.y -= BROADPHASE_EPSILON;
    this._worldMin.z -= BROADPHASE_EPSILON;
    this._worldMax.x += BROADPHASE_EPSILON;
    this._worldMax.y += BROADPHASE_EPSILON;
    this._worldMax.z += BROADPHASE_EPSILON;

    if (!this._tree) {
      this._tree = new Octree(new BoundingBox(this._worldMin, this._worldMax));
    } else {
      this._tree.root.bounds.center.copyFrom(this._worldMin).add(this._worldMax).scale(0.5);
      this._tree.clear();
    }

    this._fallback.length = 0;
    for (let i = 0; i < allColliders.length; i++) {
      const collider = allColliders[i]!;
      if (!this._tree.insert(collider)) {
        this._fallback.push(collider);
      }
    }
  }

  /**
   * Queries the broadphase Octree and fallback list for colliders intersecting the given volume.
   * @param volume Target bounding volume.
   * @param outHits Array receiving the potential collider candidates.
   */
  public queryVolume(volume: BoundingVolume, outHits: Collidable[]): void {
    if (this._tree) {
      this._tree.queryVolume(volume, outHits);
    }
    for (let i = 0; i < this._fallback.length; i++) {
      outHits.push(this._fallback[i]!);
    }
  }
}
