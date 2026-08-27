import { Object3D } from "./Object3D.js";
import { Scene } from "./Scene.js";
import { OctreeNode } from "./Octree.js";
import { Frustum, Matrix4 } from "../math/index.js";
import { Collidable } from "../interfaces/index.js";

/**
 * Handles frustum culling for objects in a scene.
 */
export class FrustumCuller {
  private static _frustum: Frustum = new Frustum();
  private static _queryHits: Collidable[] = [];

  /** The octree nodes that were intersected during the last cull operation. */
  public static lastIntersectedNodes: Set<OctreeNode> = new Set();

  /** The number of visible objects during the last cull operation. */
  public static lastVisibleCount: number = 0;

  /** The objects that passed frustum culling during the last `cull()` call, for the same scene
   * `lastVisibleCount` reflects. Cleared and repopulated every call, both octree and fallback
   * paths. Debug/introspection utility only -- like `lastVisibleCount`/`lastIntersectedNodes`,
   * this is `static` and shared page-wide, so if more than one `SmallWorld` instance is running
   * (e.g. GadgetInspector's `MaterialStudioApp` preview panel alongside a showcase's own scene),
   * whichever one's `cull()` ran most recently wins. `HzbOcclusionPassGPU` deliberately does NOT
   * read this for that reason -- it derives its own scene-scoped candidate list instead (see
   * `WebGPURenderer._collectHzbCandidates()`). */
  public static lastVisibleObjects: Object3D[] = [];

  /**
   * Culls objects in the scene that are outside the camera frustum.
   */
  public static cull(scene: Scene, vpMatrix: Matrix4): number {
    this._frustum.setFromMatrix(vpMatrix);
    this.lastIntersectedNodes.clear();
    this.lastVisibleObjects.length = 0;

    // Reset culling state for all objects
    this._resetCulling(scene.root);

    if (scene.staticOctree || scene.dynamicOctree) {
      for (const octree of [scene.staticOctree, scene.dynamicOctree]) {
        if (!octree) continue;
        this._queryHits.length = 0;
        octree.query(this._frustum, this._queryHits, this.lastIntersectedNodes);
        for (let i: number = 0; i < this._queryHits.length; i++) {
          const obj = this._queryHits[i] as Object3D;
          if (obj.isVisible) {
            obj.inFrustum = true;
            this.lastVisibleObjects.push(obj);
          }
        }
      }

      const count: number = this._countVisible(scene.root);

      FrustumCuller.lastVisibleCount = count;
      return count;
    }

    // Fallback without octrees
    let visibleCount: number = 0;
    for (let i: number = 0; i < scene.objects.length; i++) {
      visibleCount += this._checkNode(scene.objects[i]!);
    }

    FrustumCuller.lastVisibleCount = visibleCount;
    return visibleCount;
  }

  private static _resetCulling(obj: Object3D): void {
    obj.inFrustum = !(obj.frustumCulled && obj.bounds);
    for (let i: number = 0; i < obj.children.length; i++) {
      this._resetCulling(obj.children[i]!);
    }
  }

  private static _countVisible(obj: Object3D): number {
    let count: number = obj.isVisible && obj.inFrustum ? 1 : 0;
    for (let i: number = 0; i < obj.children.length; i++) {
      count += this._countVisible(obj.children[i]!);
    }
    return count;
  }

  private static _checkNode(obj: Object3D): number {
    if (obj.isVisible && obj.frustumCulled && obj.bounds) {
      obj.inFrustum = this._frustum.intersectsVolume(obj.bounds);
    } else {
      obj.inFrustum = true;
    }

    const visible = obj.isVisible && obj.inFrustum;
    if (visible) this.lastVisibleObjects.push(obj);
    let count = visible ? 1 : 0;
    for (let i: number = 0; i < obj.children.length; i++) {
      count += this._checkNode(obj.children[i]!);
    }
    return count;
  }
}
