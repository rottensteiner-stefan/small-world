/// src/core/FrustumCuller.ts

import { Frustum } from "../math/Frustum.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Object3D } from "./Object3D.js";
import { Scene } from "./Scene.js";
import { OctreeNode } from "./Octree.js";

/**
 * Handles frustum culling for objects in a scene.
 */
export class FrustumCuller {
  private static _frustum: Frustum = new Frustum();

  /** The octree nodes that were intersected during the last cull operation. */
  public static lastIntersectedNodes: Set<OctreeNode> = new Set();

  /**
   * Culls objects in the scene that are outside the camera frustum.
   */
  public static cull(scene: Scene, vpMatrix: Matrix4): number {
    this._frustum.setFromMatrix(vpMatrix);
    this.lastIntersectedNodes.clear();

    // Reset culling state for all objects
    for (let i: number = 0; i < scene.objects.length; i++) {
      this._resetCulling(scene.objects[i]!);
    }

    if (scene.staticOctree || scene.dynamicOctree) {
      if (scene.staticOctree) {
        const visibleStatic: Object3D[] = scene.staticOctree.query(
          this._frustum,
          this.lastIntersectedNodes,
        );
        for (let i: number = 0; i < visibleStatic.length; i++) {
          const obj = visibleStatic[i]!;
          if (obj.isVisible) obj.inFrustum = true;
        }
      }

      if (scene.dynamicOctree) {
        const visibleDynamic: Object3D[] = scene.dynamicOctree.query(
          this._frustum,
          this.lastIntersectedNodes,
        );
        for (let i: number = 0; i < visibleDynamic.length; i++) {
          const obj = visibleDynamic[i]!;
          if (obj.isVisible) obj.inFrustum = true;
        }
      }

      let count: number = 0;
      for (let i: number = 0; i < scene.objects.length; i++) {
        count += this._countVisible(scene.objects[i]!);
      }
      return count;
    }

    // Fallback without octrees
    let visibleCount: number = 0;
    for (let i: number = 0; i < scene.objects.length; i++) {
      visibleCount += this._checkNode(scene.objects[i]!);
    }
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
