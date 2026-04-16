import { Scene } from '../core/index.js';
/**
 * Utility to visualize collision boundaries in the scene.
 */
export declare class CollisionVisualizer {
    private static _instance;
    private _debugObjects;
    private _cubeGeo;
    private _sphereGeo;
    private _boxMat;
    private _sphereMat;
    private constructor();
    /**
     * Gets the singleton instance of the visualizer.
     * @returns The visualizer instance.
     */
    static get instance(): CollisionVisualizer;
    /**
     * Updates the debug visualization for the given scene.
     * @param scene The scene to visualize.
     */
    update(scene: Scene): void;
}
