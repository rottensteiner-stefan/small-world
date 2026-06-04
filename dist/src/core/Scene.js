/// src/core/Scene.ts
import { Octree } from "./Octree.js";
import { BoundingType, Topology } from "../enums/index.js";
/**
 * A scene that holds a collection of 3D objects.
 */
export class Scene {
    objects = [];
    _objectsByName = new Map();
    staticOctree = undefined;
    dynamicOctree = undefined;
    add(...objs) {
        for (const obj of objs) {
            this.objects.push(obj);
            this._objectsByName.set(obj.name, obj);
        }
    }
    remove(...objs) {
        for (const obj of objs) {
            const index = this.objects.indexOf(obj);
            if (-1 !== index) {
                this.objects.splice(index, 1);
                this._objectsByName.delete(obj.name);
            }
        }
    }
    initOctrees(bounds) {
        this.staticOctree = new Octree(bounds);
        this.dynamicOctree = new Octree(bounds);
    }
    getObjectByName(name) {
        return this._objectsByName.get(name);
    }
    update() {
        for (const obj of this.objects) {
            obj.updateMatrixWorld(true);
        }
        if (undefined !== this.dynamicOctree) {
            this.updateDynamicOctree();
        }
    }
    updateStaticOctree() {
        if (!this.staticOctree)
            return;
        this.staticOctree.clear();
        for (const obj of this.objects)
            this._addObjectToOctree(obj, true);
    }
    updateDynamicOctree() {
        if (!this.dynamicOctree)
            return;
        this.dynamicOctree.clear();
        for (const obj of this.objects)
            this._addObjectToOctree(obj, false);
    }
    _addObjectToOctree(obj, checkStatic) {
        // Skip debug objects to avoid recursion and unnecessary processing
        if (obj.name.startsWith("debug_")) {
            return;
        }
        if (obj.isStatic === checkStatic) {
            if (obj.geometry) {
                obj.computeBounds();
                const targetOctree = checkStatic ? this.staticOctree : this.dynamicOctree;
                if (!targetOctree?.insert(obj)) {
                    let bStr = "null";
                    if (obj.bounds) {
                        if (obj.bounds.type === BoundingType.BOX) {
                            const b = obj.bounds;
                            bStr = `${b.min.x},${b.min.y},${b.min.z} to ${b.max.x},${b.max.y},${b.max.z}`;
                        }
                        else {
                            bStr = `non-box bounds (${obj.bounds.type})`;
                        }
                    }
                    console.warn(`[Scene] Failed to add ${obj.name} to ${checkStatic ? "static" : "dynamic"} octree. Bounds: ${bStr}`);
                }
                else {
                    // console.log(`[Scene] Added ${obj.name} to ${checkStatic ? "static" : "dynamic"} octree.`);
                }
            }
        }
        for (const child of obj.children)
            this._addObjectToOctree(child, checkStatic);
    }
    /**
     * Returns visible objects, respecting BOTH user visibility and frustum state.
     * Grouping: shaderId -> topology -> matUuid -> Object3D[]
     */
    getVisibleObjectsSorted() {
        const sorted = new Map();
        for (let i = 0; i < this.objects.length; i++) {
            this._collectVisible(this.objects[i], sorted);
        }
        return sorted;
    }
    _collectVisible(obj, sorted) {
        // Only proceed if object is visible
        if (!obj.isVisible)
            return;
        if ((obj.geometry || obj.positionBuffer) &&
            obj.material) {
            const manifest = obj.material.getRenderManifest();
            const shaderId = manifest.shaderId;
            const topology = manifest.state?.topology ||
                obj.geometry?.topology ||
                (obj.geometry?.indices?.length === 2 ? Topology.LINE_LIST : Topology.TRIANGLE_LIST);
            const matUuid = obj.material.uuid;
            if (!sorted.has(shaderId))
                sorted.set(shaderId, new Map());
            const topologyMap = sorted.get(shaderId);
            if (!topologyMap.has(topology))
                topologyMap.set(topology, new Map());
            const matMap = topologyMap.get(topology);
            if (!matMap.has(matUuid))
                matMap.set(matUuid, []);
            matMap.get(matUuid).push(obj);
        }
        for (let i = 0; i < obj.children.length; i++) {
            this._collectVisible(obj.children[i], sorted);
        }
    }
    get octree() {
        return this.staticOctree;
    }
}
//# sourceMappingURL=Scene.js.map