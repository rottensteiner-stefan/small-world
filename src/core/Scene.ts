/// src/core/Scene.ts
import { Object3D } from "./Object3D.js";
import { Octree } from "./Octree.js";
import { Fog } from "./Fog.js";
import { Matrix4, Frustum, Vector3D } from "../math/index.js";
import { BoundingBox, SpatialHash } from "../physix/index.js";
import { BoundingType, Topology } from "../enums/index.js";
import { DirectionalLight } from "./lights/index.js";

export interface RenderList {
  opaque: Map<string, Map<string, Map<string, Object3D[]>>>;
  transparent: Object3D[];
}

/**
 * A scene that holds a collection of 3D objects.
 */
export class Scene {
  public readonly root: Object3D = new Object3D("SceneRoot");

  public get objects(): Object3D[] {
    return this.root.children;
  }

  public staticOctree: Octree | undefined = undefined;
  public dynamicOctree: Octree | undefined = undefined;
  public spatialHash: SpatialHash | undefined = undefined;
  public fog?: Fog;

  // Global Environment (IBL)
  public irradianceMap?: import("./textures/index.js").CubeTexture;
  public prefilterMap?: import("./textures/index.js").CubeTexture;
  public brdfLUT?: import("./textures/index.js").Texture;
  public environmentIntensity: number = 1.0;

  // Persistent cache for rendering
  private readonly _renderList: RenderList = { opaque: new Map(), transparent: [] };

  private _scratchFrustum: Frustum = new Frustum();
  private _scratchMatrix: Matrix4 = new Matrix4();

  public add(...objs: Object3D[]): void {
    this.root.add(...objs);
  }

  public remove(...objs: Object3D[]): void {
    this.root.remove(...objs);
  }

  public initOctrees(bounds: BoundingBox): void {
    this.staticOctree = new Octree(bounds);
    this.dynamicOctree = new Octree(bounds);
  }

  public getObjectByName(name: string): Object3D | undefined {
    // Avoid returning the hidden root itself
    const found = this.root.getObjectByName(name);
    return found === this.root ? undefined : found;
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
   * Separates opaque and transparent objects.
   * Opaque Grouping: shaderId -> topology -> matUuid -> Object3D[]
   * Transparent: Object3D[] sorted back-to-front
   */
  public getVisibleObjectsSorted(vp: Float32Array, camPos: Vector3D): RenderList {
    // Clear the persistent list without destroying the structures (Monomorphism/GC optimization)
    this._renderList.transparent.length = 0;
    for (const topologyMap of this._renderList.opaque.values()) {
      for (const matMap of topologyMap.values()) {
        for (const objectsArray of matMap.values()) {
          objectsArray.length = 0;
        }
      }
    }

    const frustum = this._scratchFrustum;
    const vpMat = this._scratchMatrix;
    vpMat.data.set(vp);
    frustum.setFromMatrix(vpMat);

    for (let i: number = 0; i < this.objects.length; i++) {
      this._collectVisible(this.objects[i]!, this._renderList, frustum);
    }

    // Sort transparent objects back-to-front
    this._renderList.transparent.sort((a, b) => {
      const aData = a.worldMatrix.data;
      const ax = aData[12]! - camPos.x;
      const ay = aData[13]! - camPos.y;
      const az = aData[14]! - camPos.z;
      const distA = ax * ax + ay * ay + az * az;

      const bData = b.worldMatrix.data;
      const bx = bData[12]! - camPos.x;
      const by = bData[13]! - camPos.y;
      const bz = bData[14]! - camPos.z;
      const distB = bx * bx + by * by + bz * bz;

      return distB - distA; // Furthest first
    });

    return this._renderList;
  }

  private _collectVisible(obj: Object3D, renderList: RenderList, frustum: Frustum): void {
    // Only proceed if object is visible
    if (!obj.isVisible) return;

    // Frustum Culling
    if (obj.frustumCulled && obj.bounds) {
      if (!obj.inFrustum) {
        return;
      }
    }

    if (
      (obj.geometry || (obj as Object3D & { positionBuffer?: unknown }).positionBuffer) &&
      obj.material
    ) {
      const manifest = obj.material.getRenderManifest();

      if (manifest.state?.transparent) {
        renderList.transparent.push(obj);
      } else {
        const shaderId = manifest.shaderId;
        const topology =
          manifest.state?.topology ||
          obj.geometry?.topology ||
          (obj.geometry?.indices?.length === 2 ? Topology.LINE_LIST : Topology.TRIANGLE_LIST);
        const matUuid = obj.material.uuid;

        if (!renderList.opaque.has(shaderId)) renderList.opaque.set(shaderId, new Map());
        const topologyMap = renderList.opaque.get(shaderId)!;

        if (!topologyMap.has(topology)) topologyMap.set(topology, new Map());
        const matMap = topologyMap.get(topology)!;

        if (!matMap.has(matUuid)) matMap.set(matUuid, []);
        matMap.get(matUuid)!.push(obj);
      }
    }

    for (let i: number = 0; i < obj.children.length; i++) {
      this._collectVisible(obj.children[i]!, renderList, frustum);
    }
  }

  public get octree(): Octree | undefined {
    return this.staticOctree;
  }
}
