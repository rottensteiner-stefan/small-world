/// src/core/Scene.ts

import { Object3D } from "./Object3D.js";
import { Octree } from "./Octree.js";
import { BoundingBox } from "../physix/index.js";
import { BoundingType, Topology } from "../enums/index.js";
import { DirectionalLight } from "./lights/index.js";

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

  public update(deltaTime: number = 0): void {
    // 1. Update behaviors
    for (const obj of this.objects) {
      this._updateBehaviorsRecursive(obj, deltaTime);
    }
    // 2. Update matrices
    for (const obj of this.objects) {
      obj.updateMatrixWorld(true);
    }
    if (undefined !== this.dynamicOctree) {
      this.updateDynamicOctree();
    }
  }

  public updateLights(camera: import("../interfaces/index.js").CameraInterfaceData): void {
    for (const obj of this.objects) {
      this._updateLightsRecursive(obj, camera);
    }
  }

  private _updateLightsRecursive(
    obj: Object3D,
    camera: import("../interfaces/index.js").CameraInterfaceData,
  ): void {
    if (obj instanceof DirectionalLight) {
      obj.updateCascades(camera);
    }
    for (const child of obj.children) {
      this._updateLightsRecursive(child, camera);
    }
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
    // Skip debug objects to avoid recursion and unnecessary processing
    if (obj.name.startsWith("debug_")) {
      return;
    }

    if (obj.isStatic === checkStatic) {
      if (obj.geometry) {
        obj.computeBounds();
        const targetOctree = checkStatic ? this.staticOctree : this.dynamicOctree;
        if (!targetOctree?.insert(obj)) {
          let bStr: string = "null";
          if (obj.bounds) {
            if (obj.bounds.type === BoundingType.BOX) {
              const b = obj.bounds as BoundingBox;
              bStr = `${b.min.x},${b.min.y},${b.min.z} to ${b.max.x},${b.max.y},${b.max.z}`;
            } else {
              bStr = `non-box bounds (${obj.bounds.type})`;
            }
          }
          console.warn(
            `[Scene] Failed to add ${obj.name} to ${checkStatic ? "static" : "dynamic"} octree. Bounds: ${bStr}`,
          );
        } else {
          // console.log(`[Scene] Added ${obj.name} to ${checkStatic ? "static" : "dynamic"} octree.`);
        }
      }
    }
    for (const child of obj.children) this._addObjectToOctree(child, checkStatic);
  }

  private _updateBehaviorsRecursive(obj: Object3D, deltaTime: number): void {
    for (let i = 0; i < obj.behaviors.length; i++) {
      const b = obj.behaviors[i]!;
      if (b.isActive) b.update(deltaTime);
    }
    for (let i = 0; i < obj.children.length; i++) {
      this._updateBehaviorsRecursive(obj.children[i]!, deltaTime);
    }
  }

  /**
   * Returns visible objects, respecting BOTH user visibility and frustum state.
   * Grouping: shaderId -> topology -> matUuid -> Object3D[]
   */
  public getVisibleObjectsSorted(): Map<string, Map<string, Map<string, Object3D[]>>> {
    const sorted: Map<string, Map<string, Map<string, Object3D[]>>> = new Map();
    for (let i: number = 0; i < this.objects.length; i++) {
      this._collectVisible(this.objects[i]!, sorted);
    }
    return sorted;
  }

  private _collectVisible(
    obj: Object3D,
    sorted: Map<string, Map<string, Map<string, Object3D[]>>>,
  ): void {
    // Only proceed if object is visible
    if (!obj.isVisible) return;

    if (
      (obj.geometry || (obj as Object3D & { positionBuffer?: unknown }).positionBuffer) &&
      obj.material
    ) {
      const manifest = obj.material.getRenderManifest();
      const shaderId = manifest.shaderId;
      const topology =
        manifest.state?.topology ||
        obj.geometry?.topology ||
        (obj.geometry?.indices?.length === 2 ? Topology.LINE_LIST : Topology.TRIANGLE_LIST);
      const matUuid = obj.material.uuid;

      if (!sorted.has(shaderId)) sorted.set(shaderId, new Map());
      const topologyMap = sorted.get(shaderId)!;

      if (!topologyMap.has(topology)) topologyMap.set(topology, new Map());
      const matMap = topologyMap.get(topology)!;

      if (!matMap.has(matUuid)) matMap.set(matUuid, []);
      matMap.get(matUuid)!.push(obj);
    }

    for (let i: number = 0; i < obj.children.length; i++) {
      this._collectVisible(obj.children[i]!, sorted);
    }
  }

  public get octree(): Octree | undefined {
    return this.staticOctree;
  }
}
