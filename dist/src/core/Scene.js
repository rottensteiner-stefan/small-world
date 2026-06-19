/// src/core/Scene.ts
import { Octree } from "./Octree.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Frustum } from "../math/Frustum.js";
import { BoundingType, Topology } from "../enums/index.js";
import { DirectionalLight } from "./lights/index.js";
/**
 * A scene that holds a collection of 3D objects.
 */
export class Scene {
    objects = [];
    _objectsByName = new Map();
    staticOctree = undefined;
    dynamicOctree = undefined;
    fog;
    // Persistent cache for rendering
    _renderList = { opaque: new Map(), transparent: [] };
    _scratchFrustum = new Frustum();
    _scratchMatrix = new Matrix4();
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
    update(deltaTime = 0) {
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
    updateLights(camera) {
        for (const obj of this.objects) {
            this._updateLightsRecursive(obj, camera);
        }
    }
    _updateLightsRecursive(obj, camera) {
        if (obj instanceof DirectionalLight) {
            obj.updateCascades(camera);
        }
        for (const child of obj.children) {
            this._updateLightsRecursive(child, camera);
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
    _updateBehaviorsRecursive(obj, deltaTime) {
        for (let i = 0; i < obj.behaviors.length; i++) {
            const b = obj.behaviors[i];
            if (b.isActive)
                b.update(deltaTime);
        }
        for (let i = 0; i < obj.children.length; i++) {
            this._updateBehaviorsRecursive(obj.children[i], deltaTime);
        }
    }
    /**
     * Returns visible objects, respecting BOTH user visibility and frustum state.
     * Separates opaque and transparent objects.
     * Opaque Grouping: shaderId -> topology -> matUuid -> Object3D[]
     * Transparent: Object3D[] sorted back-to-front
     */
    getVisibleObjectsSorted(vp, camPos) {
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
        for (let i = 0; i < this.objects.length; i++) {
            this._collectVisible(this.objects[i], this._renderList, frustum);
        }
        // Sort transparent objects back-to-front
        this._renderList.transparent.sort((a, b) => {
            const aData = a.worldMatrix.data;
            const ax = aData[12] - camPos.x;
            const ay = aData[13] - camPos.y;
            const az = aData[14] - camPos.z;
            const distA = ax * ax + ay * ay + az * az;
            const bData = b.worldMatrix.data;
            const bx = bData[12] - camPos.x;
            const by = bData[13] - camPos.y;
            const bz = bData[14] - camPos.z;
            const distB = bx * bx + by * by + bz * bz;
            return distB - distA; // Furthest first
        });
        return this._renderList;
    }
    _collectVisible(obj, renderList, frustum) {
        // Only proceed if object is visible
        if (!obj.isVisible)
            return;
        // Frustum Culling
        if (obj.frustumCulled && obj.bounds) {
            if (!obj.inFrustum) {
                return;
            }
        }
        if ((obj.geometry || obj.positionBuffer) &&
            obj.material) {
            const manifest = obj.material.getRenderManifest();
            if (manifest.state?.transparent) {
                renderList.transparent.push(obj);
            }
            else {
                const shaderId = manifest.shaderId;
                const topology = manifest.state?.topology ||
                    obj.geometry?.topology ||
                    (obj.geometry?.indices?.length === 2 ? Topology.LINE_LIST : Topology.TRIANGLE_LIST);
                const matUuid = obj.material.uuid;
                if (!renderList.opaque.has(shaderId))
                    renderList.opaque.set(shaderId, new Map());
                const topologyMap = renderList.opaque.get(shaderId);
                if (!topologyMap.has(topology))
                    topologyMap.set(topology, new Map());
                const matMap = topologyMap.get(topology);
                if (!matMap.has(matUuid))
                    matMap.set(matUuid, []);
                matMap.get(matUuid).push(obj);
            }
        }
        for (let i = 0; i < obj.children.length; i++) {
            this._collectVisible(obj.children[i], renderList, frustum);
        }
    }
    get octree() {
        return this.staticOctree;
    }
}
//# sourceMappingURL=Scene.js.map