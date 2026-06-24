import { Scene } from '../core/index.js';
import { OctreeNode } from '../core/Octree.js';
/**
 * Utility to visualize the Octree structure in the scene.
 */
export declare class OctreeVisualizer {
    private static _instance;
    private _debugObjects;
    private _cubeGeo;
    private _nodeMat;
    private _activeNodeMat;
    private _dynamicNodeMat;
    /**
     * Private constructor to enforce singleton pattern.
     */
    private constructor();
    /**
     * Gets the singleton instance of the visualizer.
     * @returns The visualizer instance.
     */
    static get instance(): OctreeVisualizer;
    /**
     * Updates the debug visualization for the octrees in the given scene.
     * @param scene The scene containing the octrees.
     * @param activeNodes Optional list of nodes that are currently active (intersected by frustum).
     */
    update(scene: Scene, activeNodes?: Set<OctreeNode>): void;
    /**
     * Updates or creates a debug object for a node.
     * @private
     */
    private _updateDebugObject;
    /**
     * Clears all debug objects from the scene.
     * @param scene The scene to clear.
     * @private
     */
    private _clear;
    /**
     * Recursively traverses the octree nodes.
     * @private
     */
    private _traverse;
}
