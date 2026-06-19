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
    /** The number of visible objects during the last cull operation. */
    static lastVisibleCount: number;
    /**
     * Culls objects in the scene that are outside the camera frustum.
     */
    static cull(scene: Scene, vpMatrix: Matrix4): number;
    private static _resetCulling;
    private static _countVisible;
    private static _checkNode;
}
