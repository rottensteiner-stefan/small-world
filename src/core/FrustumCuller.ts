/// src/core/FrustumCuller.ts

import { Frustum } from "../math/Frustum.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Object3D } from "./Object3D.js";
import { Scene } from "./Scene.js";

/**
 * Handles frustum culling for objects in a scene.
 */
export class FrustumCuller {
  private static _frustum: Frustum = new Frustum();

  /**
   * Culls objects in the scene that are outside the camera frustum.
   * @param scene The scene to cull.
   * @param vpMatrix The view-projection matrix.
   * @returns The number of visible objects.
   */
  public static cull(scene: Scene, vpMatrix: Matrix4): number {
    this._frustum.setFromMatrix(vpMatrix);

    if (scene.octree) {
      for (const obj of scene.objects) {
        this._resetVisibility(obj);
      }

      const visibleObjects: Object3D[] = scene.octree.query(this._frustum);
      for (const obj of visibleObjects) {
        obj.isVisible = true;
      }

      let count: number = 0;
      for (const obj of scene.objects) {
        count += this._countVisible(obj);
      }
      return count;
    }

    let visibleCount: number = 0;

    for (const obj of scene.objects) {
      visibleCount += this._checkNode(obj);
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

    for (const child of obj.children) {
      this._resetVisibility(child);
    }
  }

  /**
   * Counts the visible objects in a hierarchy.
   * @param obj The object to count.
   * @private
   */
  private static _countVisible(obj: Object3D): number {
    let count: number = obj.isVisible ? 1 : 0;
    for (const child of obj.children) {
      count += this._countVisible(child);
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

    for (const child of obj.children) {
      count += this._checkNode(child);
    }

    return count;
  }
}
