import { Matrix4 } from '../math/Matrix4.js';
import { Scene } from './Scene.js';
import { OctreeNode } from './Octree.js';
/**
 * Handles frustum culling for objects in a scene.
 */
export declare class FrustumCuller {
    private static _frustum;
    /** The octree nodes that were intersected during the last cull operation. */
    static lastIntersectedNodes: Set<OctreeNode>;
    /**
     * Culls objects in the scene that are outside the camera frustum.
     * @param scene The scene to cull.
     * @param vpMatrix The view-projection matrix.
     * @returns The number of visible objects.
     */
    static cull(scene: Scene, vpMatrix: Matrix4): number;
    /**
     * Resets the visibility of an object and its children.
     * @param obj The object to reset.
     * @private
     */
    private static _resetVisibility;
    /**
     * Counts the visible objects in a hierarchy.
     * @param obj The object to count.
     * @private
     */
    private static _countVisible;
    /**
     * Recursively checks a node for visibility.
     * @param obj The object to check.
     * @private
     */
    private static _checkNode;
}
