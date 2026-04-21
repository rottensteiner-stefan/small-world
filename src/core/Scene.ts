/// src/core/Scene.ts

import { Object3D } from "./Object3D.js";
import { Octree } from "./Octree.js";
import { BoundingBox } from "../physics/BoundingBox.js";

/**
 * A scene that holds a collection of 3D objects.
 */
export class Scene {
  public objects: Object3D[] = [];
  private readonly _objectsByName: Map<string, Object3D> = new Map();
  public staticOctree: Octree | undefined = undefined;
  public dynamicOctree: Octree | undefined = undefined;

  public add(...objs: Object3D[]): void {
    for (const obj of objs) {
      this.objects.push(obj);
      this._objectsByName.set(obj.name, obj);
    }
  }

  public remove(...objs: Object3D[]): void {
    for (const obj of objs) {
      const index: number = this.objects.indexOf(obj);
      if (-1 !== index) {
        this.objects.splice(index, 1);
        this._objectsByName.delete(obj.name);
      }
    }
  }

  public initOctrees(bounds: BoundingBox): void {
    this.staticOctree = new Octree(bounds);
    this.dynamicOctree = new Octree(bounds);
  }

  public getObjectByName(name: string): Object3D | undefined {
    return this._objectsByName.get(name);
  }

  public update(): void {
    for (const obj of this.objects) {
      obj.updateMatrixWorld(true);
    }
    if (this.dynamicOctree) this.updateDynamicOctree();
  }

  public updateStaticOctree(): void {
    if (!this.staticOctree) return;
    this.staticOctree.clear();
    for (const obj of this.objects) this._addObjectToOctree(obj, true);
  }

  public updateDynamicOctree(): void {
    if (!this.dynamicOctree) return;
    this.dynamicOctree.clear();
    for (const obj of this.objects) this._addObjectToOctree(obj, false);
  }

  private _addObjectToOctree(obj: Object3D, checkStatic: boolean): void {
    if (obj.isStatic === checkStatic) {
      if (obj.geometry) {
        obj.computeBounds();
        const targetOctree = checkStatic ? this.staticOctree : this.dynamicOctree;
        targetOctree?.insert(obj);
      }
    }
    for (const child of obj.children) this._addObjectToOctree(child, checkStatic);
  }

  /**
   * Returns visible objects, respecting BOTH user visibility and frustum state.
   */
  public getVisibleObjectsSorted(): Map<string, Map<string, Object3D[]>> {
    const sorted: Map<string, Map<string, Object3D[]>> = new Map();
    for (let i: number = 0; i < this.objects.length; i++) {
      this._collectVisible(this.objects[i]!, sorted);
    }
    return sorted;
  }

  private _collectVisible(obj: Object3D, sorted: Map<string, Map<string, Object3D[]>>): void {
    // Only proceed if object is visible and within the frustum
    if (!obj.isVisible || !obj.inFrustum) return;

    if (obj.geometry && obj.material) {
      const manifest = obj.material.getRenderManifest();
      const shaderId = manifest.shaderId;
      const matUuid = obj.material.uuid;

      if (!sorted.has(shaderId)) sorted.set(shaderId, new Map());
      const shaderMap = sorted.get(shaderId)!;

      if (!shaderMap.has(matUuid)) shaderMap.set(matUuid, []);
      shaderMap.get(matUuid)!.push(obj);
    }

    for (let i: number = 0; i < obj.children.length; i++) {
      this._collectVisible(obj.children[i]!, sorted);
    }
  }

  public get octree(): Octree | undefined {
    return this.staticOctree;
  }
}
