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
   * @param scene The scene to cull.
   * @param vpMatrix The view-projection matrix.
   * @returns The number of visible objects.
   */
  public static cull(scene: Scene, vpMatrix: Matrix4): number {
    this._frustum.setFromMatrix(vpMatrix);
    this.lastIntersectedNodes.clear();

    // Reset visibility for all objects that can be culled
    for (let i: number = 0; i < scene.objects.length; i++) {
      this._resetVisibility(scene.objects[i]!);
    }

    if (scene.staticOctree || scene.dynamicOctree) {
      // Query static octree
      if (scene.staticOctree) {
        const visibleStatic: Object3D[] = scene.staticOctree.query(this._frustum, this.lastIntersectedNodes);
        for (let i: number = 0; i < visibleStatic.length; i++) {
          visibleStatic[i]!.isVisible = true;
        }
      }

      // Query dynamic octree
      if (scene.dynamicOctree) {
        const visibleDynamic: Object3D[] = scene.dynamicOctree.query(this._frustum, this.lastIntersectedNodes);
        for (let i: number = 0; i < visibleDynamic.length; i++) {
          visibleDynamic[i]!.isVisible = true;
        }
      }

      let count: number = 0;
      for (let i: number = 0; i < scene.objects.length; i++) {
        count += this._countVisible(scene.objects[i]!);
      }
      return count;
    }

    // Fallback if no octrees are used
    let visibleCount: number = 0;
    for (let i: number = 0; i < scene.objects.length; i++) {
      visibleCount += this._checkNode(scene.objects[i]!);
    }

    return visibleCount;
  }

  /**
   * Resets the visibility of an object and its children.
   * @param obj The object to reset.
   * @private
   */
  private static _resetVisibility(obj: Object3D): void {
    if (obj.frustumCulled && obj.bounds) {
      obj.isVisible = false;
    } else {
      obj.isVisible = true;
    }

    for (let i: number = 0; i < obj.children.length; i++) {
      this._resetVisibility(obj.children[i]!);
    }
  }

  /**
   * Counts the visible objects in a hierarchy.
   * @param obj The object to count.
   * @private
   */
  private static _countVisible(obj: Object3D): number {
    let count: number = obj.isVisible ? 1 : 0;
    for (let i: number = 0; i < obj.children.length; i++) {
      count += this._countVisible(obj.children[i]!);
    }
    return count;
  }

  /**
   * Recursively checks a node for visibility.
   * @param obj The object to check.
   * @private
   */
  private static _checkNode(obj: Object3D): number {
    if (obj.frustumCulled && obj.bounds) {
      obj.isVisible = this._frustum.intersectsVolume(obj.bounds);
    } else {
      obj.isVisible = true;
    }

    let count = obj.isVisible ? 1 : 0;

    for (let i: number = 0; i < obj.children.length; i++) {
      count += this._checkNode(obj.children[i]!);
    }

    return count;
  }
}
