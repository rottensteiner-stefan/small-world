/// src/core/Scene.ts

import { Object3D } from "./Object3D.js";
import { Octree } from "./Octree.js";
import { BoundingBox } from "../physics/BoundingBox.js";

/**
 * A scene that holds a collection of 3D objects.
 */
export class Scene {
  /**
   * The list of objects in the scene.
   */
  public objects: Object3D[] = [];

  /**
   * A map for fast O(1) object lookups by name.
   */
  private readonly _objectsByName: Map<string, Object3D> = new Map();

  /** The octree for static objects. */
  public staticOctree: Octree | undefined = undefined;

  /** The octree for dynamic objects. */
  public dynamicOctree: Octree | undefined = undefined;

  /**
   * Adds objects to the scene.
   * @param objs The objects to add.
   */
  public add(...objs: Object3D[]): void {
    for (const obj of objs) {
      this.objects.push(obj);
      this._objectsByName.set(obj.name, obj);
    }
  }

  /**
   * Removes objects from the scene.
   * @param objs The objects to remove.
   */
  public remove(...objs: Object3D[]): void {
    for (const obj of objs) {
      const index: number = this.objects.indexOf(obj);
      if (-1 !== index) {
        this.objects.splice(index, 1);
        this._objectsByName.delete(obj.name);
      }
    }
  }

  /**
   * Initializes the octrees for the scene.
   * @param bounds The bounds of the octrees.
   */
  public initOctrees(bounds: BoundingBox): void {
    this.staticOctree = new Octree(bounds);
    this.dynamicOctree = new Octree(bounds);
  }

  /**
   * Retrieves an object by its name.
   * @param name The name of the object to find.
   * @returns The object, or undefined if not found.
   */
  public getObjectByName(name: string): Object3D | undefined {
    return this._objectsByName.get(name);
  }

  /**
   * Updates all objects in the scene.
   */
  public update(): void {
    for (const obj of this.objects) {
      obj.updateMatrixWorld(true);
    }

    if (this.dynamicOctree) {
      this.updateDynamicOctree();
    }
  }

  /**
   * Rebuilds the static octree from all static objects in the scene.
   * This should be called manually when the static scene changes.
   */
  public updateStaticOctree(): void {
    if (!this.staticOctree) return;

    this.staticOctree.clear();
    for (const obj of this.objects) {
      this._addObjectToOctree(obj, true);
    }
  }

  /**
   * Rebuilds the dynamic octree from all dynamic objects in the scene.
   */
  public updateDynamicOctree(): void {
    if (!this.dynamicOctree) return;

    this.dynamicOctree.clear();
    for (const obj of this.objects) {
      this._addObjectToOctree(obj, false);
    }
  }

  /**
   * Adds an object and its children to the respective octree.
   * @param obj The object to add.
   * @param checkStatic Whether to add static or dynamic objects.
   * @private
   */
  private _addObjectToOctree(obj: Object3D, checkStatic: boolean): void {
    if (obj.bounds && obj.frustumCulled && obj.isStatic === checkStatic) {
      const targetOctree = checkStatic ? this.staticOctree : this.dynamicOctree;
      targetOctree?.insert(obj);
    }

    for (const child of obj.children) {
      this._addObjectToOctree(child, checkStatic);
    }
  }

  /**
   * Returns all visible objects in the scene, grouped by their shader ID and material UUID
   * to minimize state changes during rendering.
   * @returns A map of shader IDs to a map of material UUIDs to arrays of objects.
   */
  public getVisibleObjectsSorted(): Map<string, Map<string, Object3D[]>> {
    const sorted: Map<string, Map<string, Object3D[]>> = new Map();

    for (let i: number = 0; i < this.objects.length; i++) {
      this._collectVisible(this.objects[i]!, sorted);
    }

    return sorted;
  }

  /**
   * Recursively collects visible objects into the sorted map.
   * @private
   */
  private _collectVisible(obj: Object3D, sorted: Map<string, Map<string, Object3D[]>>): void {
    if (!obj.isVisible) return;

    if (obj.geometry && obj.material) {
      const manifest = obj.material.getRenderManifest();
      const shaderId = manifest.shaderId;
      const matUuid = obj.material.uuid;

      if (!sorted.has(shaderId)) {
        sorted.set(shaderId, new Map());
      }
      const shaderMap = sorted.get(shaderId)!;

      if (!shaderMap.has(matUuid)) {
        shaderMap.set(matUuid, []);
      }
      shaderMap.get(matUuid)!.push(obj);
    }

    for (let i: number = 0; i < obj.children.length; i++) {
      this._collectVisible(obj.children[i]!, sorted);
    }
  }

  /**
   * Backwards compatibility for the old 'octree' property.
   * Returns the static octree if it exists.
   */
  public get octree(): Octree | undefined {
    return this.staticOctree;
  }
}
