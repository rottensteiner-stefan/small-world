/// src/core/Scene.ts

import { Object3D } from "./Object3D.js";
import { Octree } from "./Octree.js";
/**
 * A scene that holds a collection of 3D objects.
 */
export class Scene {
  /**
   * The list of objects in the scene.
   */
  public objects: Object3D[] = [];

  /** The octree for spatial partitioning. */
  public octree: Octree | undefined = undefined;

  /**
   * Adds an object to the scene.
   * @param obj The object to add.
   */
  public add(obj: Object3D): void {
    this.objects.push(obj);
  }

  /**
   * Removes an object from the scene.
   * @param obj The object to remove.
   */
  public remove(obj: Object3D): void {
    const index: number = this.objects.indexOf(obj);
    if (-1 !== index) {
      this.objects.splice(index, 1);
    }
  }

  /**
   * Updates all objects in the scene.
   */
  public update(): void {
    for (const obj of this.objects) {
      obj.updateMatrixWorld(true);
    }

    if (this.octree) {
      this.updateOctree();
    }
  }

  /**
   * Rebuilds the octree from the current objects in the scene.
   */
  public updateOctree(): void {
    if (!this.octree) return;

    this.octree.clear();
    for (const obj of this.objects) {
      this._addObjectToOctree(obj);
    }
  }

  /**
   * Adds an object and its children to the octree.
   * @param obj The object to add.
   * @private
   */
  private _addObjectToOctree(obj: Object3D): void {
    if (obj.bounds && obj.frustumCulled) {
      this.octree?.insert(obj);
    }

    for (const child of obj.children) {
      this._addObjectToOctree(child);
    }
  }
}
