import { Collidable, BoundingVolume } from '../interfaces/index.js';
import { BoundingBox } from '../physix/index.js';
import { Frustum } from '../math/index.js';
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
    insert(obj: Collidable): boolean;
    private _subdivide;
    /**
     * Queries the octree for objects that intersect with the frustum.
     */
    query(frustum: Frustum, result: Collidable[], intersectedNodes?: Set<OctreeNode>): void;
    /**
     * Queries the octree for objects that intersect with a ray.
     */
    queryRay(ray: import('../physix/index.js').Ray, result: Set<Collidable>, intersectedNodes?: Set<OctreeNode>): void;
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
    query(frustum: Frustum, intersectedNodes?: Set<OctreeNode>): Collidable[];
    queryRay(ray: import('../physix/index.js').Ray, intersectedNodes?: Set<OctreeNode>): Collidable[];
    /**
     * Queries the octree for objects intersecting with a volume.
     */
    queryVolume(volume: BoundingVolume): Collidable[];
    clear(): void;
}
