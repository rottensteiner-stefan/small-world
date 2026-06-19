import { Color, Object3D, WireframeMaterial } from "../core/index.js";
import { Cube } from "../geometry/Cube.js";
/**
 * Utility to visualize the Octree structure in the scene.
 */
export class OctreeVisualizer {
    static _instance;
    _debugObjects = [];
    _cubeGeo;
    _nodeMat;
    _activeNodeMat;
    _dynamicNodeMat;
    /**
     * Private constructor to enforce singleton pattern.
     */
    constructor() {
        this._cubeGeo = new Cube({ size: 1 });
        this._nodeMat = new WireframeMaterial(new Color(100, 100, 100, 0.5)); // Gray for static nodes
        this._activeNodeMat = new WireframeMaterial(new Color(0, 255, 255, 1)); // Cyan for active nodes
        this._dynamicNodeMat = new WireframeMaterial(new Color(255, 165, 0, 0.5)); // Orange for dynamic nodes
    }
    /**
     * Gets the singleton instance of the visualizer.
     * @returns The visualizer instance.
     */
    static get instance() {
        if (!this._instance) {
            this._instance = new OctreeVisualizer();
        }
        return this._instance;
    }
    /**
     * Updates the debug visualization for the octrees in the given scene.
     * @param scene The scene containing the octrees.
     * @param activeNodes Optional list of nodes that are currently active (intersected by frustum).
     */
    update(scene, activeNodes = new Set()) {
        if (!scene.staticOctree && !scene.dynamicOctree) {
            this._clear(scene);
            return;
        }
        let objIndex = 0;
        // Visualize Static Octree
        if (scene.staticOctree) {
            this._traverse(scene.staticOctree.root, scene, activeNodes, (node, isActive) => {
                objIndex = this._updateDebugObject(node, isActive, this._nodeMat, objIndex, scene);
            });
        }
        // Visualize Dynamic Octree
        if (scene.dynamicOctree) {
            this._traverse(scene.dynamicOctree.root, scene, activeNodes, (node, isActive) => {
                objIndex = this._updateDebugObject(node, isActive, this._dynamicNodeMat, objIndex, scene);
            });
        }
        // Remove extra debug objects
        while (this._debugObjects.length > objIndex) {
            const debugObj = this._debugObjects.pop();
            if (debugObj) {
                scene.remove(debugObj);
            }
        }
    }
    /**
     * Updates or creates a debug object for a node.
     * @private
     */
    _updateDebugObject(node, isActive, defaultMat, objIndex, scene) {
        let debugObj;
        if (objIndex < this._debugObjects.length) {
            debugObj = this._debugObjects[objIndex];
        }
        else {
            debugObj = new Object3D(`debug_octree_${objIndex}`);
            debugObj.frustumCulled = false;
            debugObj.geometry = this._cubeGeo.getGeometryData();
            this._debugObjects.push(debugObj);
            scene.add(debugObj);
        }
        debugObj.material = isActive ? this._activeNodeMat : defaultMat;
        const box = node.bounds;
        const sizeX = box.max.x - box.min.x;
        const sizeY = box.max.y - box.min.y;
        const sizeZ = box.max.z - box.min.z;
        debugObj.position.copyFrom(box.center);
        debugObj.scale.set(sizeX, sizeY, sizeZ);
        debugObj.updateMatrixWorld();
        return objIndex + 1;
    }
    /**
     * Clears all debug objects from the scene.
     * @param scene The scene to clear.
     * @private
     */
    _clear(scene) {
        for (const debugObj of this._debugObjects) {
            scene.remove(debugObj);
        }
        this._debugObjects = [];
    }
    /**
     * Recursively traverses the octree nodes.
     * @private
     */
    _traverse(node, scene, activeNodes, callback) {
        callback(node, activeNodes.has(node));
        for (let i = 0; i < node.children.length; i++) {
            this._traverse(node.children[i], scene, activeNodes, callback);
        }
    }
}
//# sourceMappingURL=OctreeVisualizer.js.map