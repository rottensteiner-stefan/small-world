import { Frustum } from "../math/Frustum.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Object3D } from "./Object3D.js";
import { Scene } from "./Scene.js";

export class FrustumCuller {
  private static frustum = new Frustum();
  public static cull(scene: Scene, vpMatrix: Matrix4): number {
    this.frustum.setFromMatrix(vpMatrix);
    let visibleCount = 0;
    const checkNode = (obj: Object3D) => {
      if (obj.frustumCulled && obj.bounds) {
        obj.isVisible = this.frustum.intersectsVolume(obj.bounds);
      } else {
        obj.isVisible = true;
      }
      if (obj.isVisible) visibleCount++;
      for (const child of obj.children) {
        checkNode(child);
      }
    };
    for (const obj of scene.objects) {
      checkNode(obj);
    }
    return visibleCount;
  }
}
