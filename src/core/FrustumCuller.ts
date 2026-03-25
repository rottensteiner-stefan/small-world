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
    let visibleCount: number = 0;

    for (const obj of scene.objects) {
      visibleCount += this._checkNode(obj);
    }

    return visibleCount;
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
