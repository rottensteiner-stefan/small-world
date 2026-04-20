import { BoundingBox } from '../physics/index.js';
import { Object3D } from './Object3D.js';
import { Frustum } from '../math/Frustum.js';
import { BoundingVolume } from '../interfaces/index.js';
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
     */
    insert(obj: Object3D): boolean;
    private _subdivide;
    /**
     * Queries the octree for objects that intersect with the frustum.
     */
    query(frustum: Frustum, result: Object3D[], intersectedNodes?: Set<OctreeNode>): void;
    /**
     * Queries the octree for objects that intersect with a specific volume.
     */
    queryVolume(volume: BoundingVolume, result: Object3D[]): void;
    clear(): void;
}
/**
 * An octree for spatial partitioning.
 */
export declare class Octree {
    root: OctreeNode;
    constructor(bounds: BoundingBox, options?: OctreeOptions);
    insert(obj: Object3D): void;
    query(frustum: Frustum, intersectedNodes?: Set<OctreeNode>): Object3D[];
    /**
     * Queries the octree for objects intersecting with a volume.
     */
    queryVolume(volume: BoundingVolume): Object3D[];
    clear(): void;
}
