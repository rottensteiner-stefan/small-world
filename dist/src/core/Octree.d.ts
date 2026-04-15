import { BoundingBox } from '../physics/BoundingBox.js';
import { Object3D } from './Object3D.js';
import { Frustum } from '../math/Frustum.js';
/**
 * Configuration options for an octree node.
 */
export interface OctreeOptions {
    /** The maximum depth of the octree. Defaults to 8. */
    maxDepth?: number;
    /** The maximum number of objects in a node before it subdivides. Defaults to 10. */
    maxObjects?: number;
}
/**
 * A node in the octree.
 */
export declare class OctreeNode {
    bounds: BoundingBox;
    /** The children of this node. */
    children: OctreeNode[];
    /** The objects stored in this node. */
    objects: Object3D[];
    private readonly _depth;
    private readonly _maxDepth;
    private readonly _maxObjects;
    /**
     * Creates a new OctreeNode.
     * @param bounds The bounds of this node.
     * @param depth The current depth of this node.
     * @param options The configuration options.
     */
    constructor(bounds: BoundingBox, depth?: number, options?: OctreeOptions);
    /**
     * Inserts an object into the octree.
     * @param obj The object to insert.
     * @returns True if the object was inserted.
     */
    insert(obj: Object3D): boolean;
    /**
     * Subdivides the node into 8 children.
     * @private
     */
    private _subdivide;
    /**
     * Queries the octree for objects that intersect with the frustum.
     * @param frustum The frustum to check.
     * @param result The array to store the results.
     */
    query(frustum: Frustum, result: Object3D[]): void;
    /**
     * Clears the node and its children.
     */
    clear(): void;
}
/**
 * An octree for spatial partitioning.
 */
export declare class Octree {
    /** The root node of the octree. */
    root: OctreeNode;
    /**
     * Creates a new Octree.
     * @param bounds The bounds of the octree.
     * @param options The configuration options.
     */
    constructor(bounds: BoundingBox, options?: OctreeOptions);
    /**
     * Inserts an object into the octree.
     * @param obj The object to insert.
     */
    insert(obj: Object3D): void;
    /**
     * Queries the octree for objects that intersect with the frustum.
     * @param frustum The frustum to check.
     * @returns The list of intersecting objects.
     */
    query(frustum: Frustum): Object3D[];
    /**
     * Clears the octree.
     */
    clear(): void;
}
