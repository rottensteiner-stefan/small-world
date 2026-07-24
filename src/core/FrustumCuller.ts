/// src/core/FrustumCuller.ts
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

  /**
   * Culls objects in the scene that are outside the camera frustum.
   */
  public static cull(scene: Scene, vpMatrix: Matrix4): number {
    this._frustum.setFromMatrix(vpMatrix);
    this.lastIntersectedNodes.clear();

    // Reset culling state for all objects
    this._resetCulling(scene.root);

    if (scene.staticOctree || scene.dynamicOctree) {
      if (scene.staticOctree) {
        this._queryHits.length = 0;
        scene.staticOctree.query(this._frustum, this._queryHits, this.lastIntersectedNodes);
        for (let i: number = 0; i < this._queryHits.length; i++) {
          const obj = this._queryHits[i] as Object3D;
          if (obj.isVisible) obj.inFrustum = true;
        }
      }

      if (scene.dynamicOctree) {
        this._queryHits.length = 0;
        scene.dynamicOctree.query(this._frustum, this._queryHits, this.lastIntersectedNodes);
        for (let i: number = 0; i < this._queryHits.length; i++) {
          const obj = this._queryHits[i] as Object3D;
          if (obj.isVisible) obj.inFrustum = true;
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

    let count = obj.isVisible && obj.inFrustum ? 1 : 0;
    for (let i: number = 0; i < obj.children.length; i++) {
      count += this._checkNode(obj.children[i]!);
    }
    return count;
  }
}
