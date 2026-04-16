/// src/utils/CollisionVisualizer.ts

import { Scene, Object3D, Color } from "../core/index.js";
import { WireframeMaterial } from "../core/materials/WireframeMaterial.js";
import { Cube } from "../geometry/Cube.js";
import { Sphere } from "../geometry/Sphere.js";
import { BoundingType } from "../enums/index.js";
import { BoundingBox } from "../physics/BoundingBox.js";
import { BoundingSphere } from "../physics/BoundingSphere.js";

/**
 * Utility to visualize collision boundaries in the scene.
 */
export class CollisionVisualizer {
  private static _instance: CollisionVisualizer;
  private _debugObjects: Map<string, Object3D> = new Map();
  private _cubeGeo: Cube;
  private _sphereGeo: Sphere;
  private _boxMat: WireframeMaterial;
  private _sphereMat: WireframeMaterial;

  private constructor() {
    this._cubeGeo = new Cube({ size: 1 });
    this._sphereGeo = new Sphere({ radius: 1, widthSegments: 16, heightSegments: 12 });
    this._boxMat = new WireframeMaterial(new Color(0, 255, 0, 1)); // Green for boxes
    this._sphereMat = new WireframeMaterial(new Color(255, 255, 0, 1)); // Yellow for spheres
  }

  /**
   * Gets the singleton instance of the visualizer.
   * @returns The visualizer instance.
   */
  public static get instance(): CollisionVisualizer {
    if (!this._instance) {
      this._instance = new CollisionVisualizer();
    }
    return this._instance;
  }

  /**
   * Updates the debug visualization for the given scene.
   * @param scene The scene to visualize.
   */
  public update(scene: Scene): void {
    const activeUuids = new Set<string>();

    const traverse = (obj: Object3D): void => {
      if (obj.bounds) {
        let debugObj = this._debugObjects.get(obj.uuid);
        if (!debugObj) {
          debugObj = new Object3D(`debug_${obj.uuid}`);
          debugObj.frustumCulled = false;
          if (obj.bounds.type === BoundingType.BOX) {
            debugObj.geometry = this._cubeGeo.getGeometryData();
            debugObj.material = this._boxMat;
          } else {
            debugObj.geometry = this._sphereGeo.getGeometryData();
            debugObj.material = this._sphereMat;
          }
          scene.add(debugObj);
          this._debugObjects.set(obj.uuid, debugObj);
        }

        // Sync transforms
        if (obj.bounds.type === BoundingType.BOX) {
          const box = obj.bounds as BoundingBox;
          const sizeX = box.max.x - box.min.x;
          const sizeY = box.max.y - box.min.y;
          const sizeZ = box.max.z - box.min.z;
          debugObj.position.copyFrom(box.center);
          debugObj.scale.set(sizeX, sizeY, sizeZ);
        } else {
          const sphere = obj.bounds as BoundingSphere;
          debugObj.position.copyFrom(sphere.center);
          debugObj.scale.set(sphere.radius * 2, sphere.radius * 2, sphere.radius * 2);
        }
        debugObj.updateMatrixWorld();
        activeUuids.add(obj.uuid);
      }

      for (const child of obj.children) {
        traverse(child);
      }
    };

    for (const obj of scene.objects) {
      // Don't visualize debug objects themselves
      if (obj.name.startsWith("debug_")) continue;
      traverse(obj);
    }

    // Cleanup stale debug objects
    for (const [uuid, debugObj] of this._debugObjects.entries()) {
      if (!activeUuids.has(uuid)) {
        scene.remove(debugObj);
        this._debugObjects.delete(uuid);
      }
    }
  }
}
