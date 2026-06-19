/// src/utils/CollisionVisualizer.ts
import { Color, Object3D, WireframeMaterial } from "../core/index.js";
import { Cube } from "../geometry/Cube.js";
import { Sphere } from "../geometry/Sphere.js";
import { BoundingType } from "../enums/index.js";
/**
 * Utility to visualize collision boundaries (AABBs and Spheres) in the scene.
 * This class is designed as a singleton for easy access during debugging.
 */
export class CollisionVisualizer {
    static _instance;
    _debugObjects = new Map();
    _cubeGeo;
    _sphereGeo;
    _boxMat;
    _sphereMat;
    /**
     * Private constructor to enforce singleton pattern.
     */
    constructor() {
        this._cubeGeo = new Cube({ size: 1 });
        this._sphereGeo = new Sphere({ radius: 1, widthSegments: 16, heightSegments: 12 });
        this._boxMat = new WireframeMaterial(new Color(0, 255, 0, 1)); // Green for boxes
        this._sphereMat = new WireframeMaterial(new Color(255, 255, 0, 1)); // Yellow for spheres
    }
    /**
     * Gets the singleton instance of the visualizer.
     * @returns The visualizer instance.
     */
    static get instance() {
        if (!this._instance) {
            this._instance = new CollisionVisualizer();
        }
        return this._instance;
    }
    /**
     * Updates the debug visualization for the given scene.
     * Compares existing debug objects with current scene bounds and adds/removes/updates them.
     * @param scene The scene to visualize.
     */
    update(scene) {
        const activeUuids = new Set();
        for (let i = 0; i < scene.objects.length; i++) {
            const obj = scene.objects[i];
            // Don't visualize debug objects themselves
            if (0 === obj.name.indexOf("debug_")) {
                continue;
            }
            this._traverse(obj, scene, activeUuids);
        }
        // Cleanup stale debug objects
        for (const [uuid, debugObj] of this._debugObjects.entries()) {
            if (!activeUuids.has(uuid)) {
                scene.remove(debugObj);
                this._debugObjects.delete(uuid);
            }
        }
    }
    /**
     * Recursively traverses the object hierarchy to find and update bounds.
     * @param obj The current object to check.
     * @param scene The scene to add debug objects to.
     * @param activeUuids Set to track which debug objects are still needed.
     * @private
     */
    _traverse(obj, scene, activeUuids) {
        if (obj.bounds) {
            let debugObj = this._debugObjects.get(obj.uuid);
            if (undefined === debugObj) {
                debugObj = new Object3D(`debug_${obj.uuid}`);
                debugObj.frustumCulled = false;
                if (BoundingType.BOX === obj.bounds.type) {
                    debugObj.geometry = this._cubeGeo.getGeometryData();
                    debugObj.material = this._boxMat;
                }
                else {
                    debugObj.geometry = this._sphereGeo.getGeometryData();
                    debugObj.material = this._sphereMat;
                }
                scene.add(debugObj);
                this._debugObjects.set(obj.uuid, debugObj);
            }
            // Sync transforms
            if (BoundingType.BOX === obj.bounds.type) {
                const box = obj.bounds;
                const sizeX = box.max.x - box.min.x;
                const sizeY = box.max.y - box.min.y;
                const sizeZ = box.max.z - box.min.z;
                debugObj.position.copyFrom(box.center);
                debugObj.scale.set(sizeX, sizeY, sizeZ);
            }
            else {
                const sphere = obj.bounds;
                debugObj.position.copyFrom(sphere.center);
                debugObj.scale.set(sphere.radius * 2, sphere.radius * 2, sphere.radius * 2);
            }
            debugObj.updateMatrixWorld();
            activeUuids.add(obj.uuid);
        }
        for (let i = 0; i < obj.children.length; i++) {
            this._traverse(obj.children[i], scene, activeUuids);
        }
    }
}
//# sourceMappingURL=CollisionVisualizer.js.map