import { Collidable, BoundingVolume } from '../interfaces/index.js';
import { BoundingBox } from '../physix/index.js';
import { Frustum, Vector3D } from '../math/index.js';
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
    objects: Collidable[];
    private _depth;
    private _maxDepth;
    private _maxObjects;
    private static _nodePool;
    static acquire(boundsMin: Vector3D, boundsMax: Vector3D, depth: number, options: OctreeOptions): OctreeNode;
    static release(node: OctreeNode): void;
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
    insert(obj: Collidable): boolean;
    private _subdivide;
    /**
     * Queries the octree for objects that intersect with the frustum.
     */
    query(frustum: Frustum, result: Collidable[], intersectedNodes?: Set<OctreeNode>): void;
    /**
     * Queries the octree for objects that intersect with a ray.
     */
    queryRay(ray: import('../physix/index.js').Ray, result: Collidable[], intersectedNodes?: Set<OctreeNode>): void;
    /**
     * Queries the octree for objects that intersect with a specific volume.
     */
    queryVolume(volume: BoundingVolume, result: Collidable[]): void;
    clear(): void;
}
/**
 * An octree for spatial partitioning.
 */
export declare class Octree {
    root: OctreeNode;
    constructor(bounds: BoundingBox, options?: OctreeOptions);
    insert(obj: Collidable): boolean;
    query(frustum: Frustum, outResult: Collidable[], intersectedNodes?: Set<OctreeNode>): void;
    queryRay(ray: import('../physix/index.js').Ray, outResult: Collidable[], intersectedNodes?: Set<OctreeNode>): void;
    queryVolume(volume: BoundingVolume, outResult: Collidable[]): void;
    clear(): void;
}
