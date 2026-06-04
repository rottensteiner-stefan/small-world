/// src/core/Octree.ts
import { BoundingBox, Collision } from "../physix/index.js";
import { MathPool, Vector3D } from "../math/index.js";
/**
 * A node in the octree.
 */
export class OctreeNode {
    bounds;
    /** The children of this node. */
    children = [];
    /** The objects stored in this node. */
    objects = [];
    _depth;
    _maxDepth;
    _maxObjects;
    /**
     * Creates a new OctreeNode.
     * @param bounds The bounds of this node.
     * @param depth The current depth of this node.
     * @param options The configuration options.
     */
    constructor(bounds, depth = 0, options = {}) {
        this.bounds = bounds;
        const { maxDepth = 8, maxObjects = 10 } = options;
        this._depth = depth;
        this._maxDepth = maxDepth;
        this._maxObjects = maxObjects;
    }
    /**
     * Inserts an object into the octree.
     */
    insert(obj) {
        if (undefined === obj.bounds) {
            return false;
        }
        if (false === this.bounds.containsVolume(obj.bounds)) {
            return false;
        }
        if (0 < this.children.length) {
            for (let i = 0; i < this.children.length; i++) {
                if (this.children[i].insert(obj)) {
                    return true;
                }
            }
        }
        this.objects.push(obj);
        if (this.objects.length > this._maxObjects && this._depth < this._maxDepth) {
            this._subdivide();
        }
        return true;
    }
    _subdivide() {
        const min = this.bounds.min;
        const max = this.bounds.max;
        const center = MathPool.acquireVector().copyFrom(min).add(max).scale(0.5);
        const dims = [
            [min.x, center.x],
            [center.x, max.x],
            [min.y, center.y],
            [center.y, max.y],
            [min.z, center.z],
            [center.z, max.z],
        ];
        for (let x = 0; x < 2; x++) {
            for (let y = 0; y < 2; y++) {
                for (let z = 0; z < 2; z++) {
                    const childMin = new Vector3D(dims[0]?.[x] ?? 0, dims[2]?.[y] ?? 0, dims[4]?.[z] ?? 0);
                    const childMax = new Vector3D(dims[1]?.[x] ?? 0, dims[3]?.[y] ?? 0, dims[5]?.[z] ?? 0);
                    this.children.push(new OctreeNode(new BoundingBox(childMin, childMax), this._depth + 1, {
                        maxDepth: this._maxDepth,
                        maxObjects: this._maxObjects,
                    }));
                }
            }
        }
        MathPool.releaseVector(center);
        const oldObjects = this.objects;
        this.objects = [];
        for (let i = 0; i < oldObjects.length; i++) {
            const obj = oldObjects[i];
            let insertedInChild = false;
            for (let j = 0; j < this.children.length; j++) {
                if (this.children[j].insert(obj)) {
                    insertedInChild = true;
                    break;
                }
            }
            if (false === insertedInChild) {
                this.objects.push(obj);
            }
        }
    }
    /**
     * Queries the octree for objects that intersect with the frustum.
     */
    query(frustum, result, intersectedNodes) {
        if (!frustum.intersectsBox(this.bounds))
            return;
        if (intersectedNodes)
            intersectedNodes.add(this);
        for (let i = 0; i < this.objects.length; i++) {
            const obj = this.objects[i];
            if (obj.bounds && frustum.intersectsVolume(obj.bounds)) {
                result.push(obj);
            }
        }
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].query(frustum, result, intersectedNodes);
        }
    }
    /**
     * Queries the octree for objects that intersect with a specific volume.
     */
    queryVolume(volume, result) {
        if (!Collision.test(this.bounds, volume))
            return;
        for (let i = 0; i < this.objects.length; i++) {
            const obj = this.objects[i];
            if (obj.bounds && Collision.test(obj.bounds, volume)) {
                result.push(obj);
            }
        }
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].queryVolume(volume, result);
        }
    }
    clear() {
        this.objects = [];
        for (let i = 0; i < this.children.length; i++)
            this.children[i].clear();
        this.children = [];
    }
}
/**
 * An octree for spatial partitioning.
 */
export class Octree {
    root;
    constructor(bounds, options = {}) {
        this.root = new OctreeNode(bounds, 0, options);
    }
    insert(obj) {
        return this.root.insert(obj);
    }
    query(frustum, intersectedNodes) {
        const result = [];
        this.root.query(frustum, result, intersectedNodes);
        return result;
    }
    /**
     * Queries the octree for objects intersecting with a volume.
     */
    queryVolume(volume) {
        const result = [];
        this.root.queryVolume(volume, result);
        return result;
    }
    clear() {
        this.root.clear();
    }
}
//# sourceMappingURL=Octree.js.map