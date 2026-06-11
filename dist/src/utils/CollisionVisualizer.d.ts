import { Scene } from '../core/index.js';
/**
 * Utility to visualize collision boundaries (AABBs and Spheres) in the scene.
 * This class is designed as a singleton for easy access during debugging.
 */
export declare class CollisionVisualizer {
    private static _instance;
    private _debugObjects;
    private _cubeGeo;
    private _sphereGeo;
    private _boxMat;
    private _sphereMat;
    /**
     * Private constructor to enforce singleton pattern.
     */
    private constructor();
    /**
     * Gets the singleton instance of the visualizer.
     * @returns The visualizer instance.
     */
    static get instance(): CollisionVisualizer;
    /**
     * Updates the debug visualization for the given scene.
     * Compares existing debug objects with current scene bounds and adds/removes/updates them.
     * @param scene The scene to visualize.
     */
    update(scene: Scene): void;
    /**
     * Recursively traverses the object hierarchy to find and update bounds.
     * @param obj The current object to check.
     * @param scene The scene to add debug objects to.
     * @param activeUuids Set to track which debug objects are still needed.
     * @private
     */
    private _traverse;
}
