/// src/core/Octree.ts

import { BoundingBox, Collision } from "../physix/index.js";
import { Object3D } from "./Object3D.js";
import { Frustum } from "../math/Frustum.js";
import { MathPool, Vector3D } from "../math/index.js";
import { BoundingVolume } from "../interfaces/index.js";

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
export class OctreeNode {
  /** The children of this node. */
  public children: OctreeNode[] = [];
  /** The objects stored in this node. */
  public objects: Object3D[] = [];

  private readonly _depth: number;
  private readonly _maxDepth: number;
  private readonly _maxObjects: number;

  /**
   * Creates a new OctreeNode.
   * @param bounds The bounds of this node.
   * @param depth The current depth of this node.
   * @param options The configuration options.
   */
  constructor(
    public bounds: BoundingBox,
    depth: number = 0,
    options: OctreeOptions = {},
  ) {
    const { maxDepth = 8, maxObjects = 10 } = options;
    this._depth = depth;
    this._maxDepth = maxDepth;
    this._maxObjects = maxObjects;
  }

  /**
   * Inserts an object into the octree.
   */
  public insert(obj: Object3D): boolean {
    if (undefined === obj.bounds) {
      return false;
    }

    if (false === this.bounds.containsVolume(obj.bounds)) {
      return false;
    }

    if (0 < this.children.length) {
      for (let i: number = 0; i < this.children.length; i++) {
        if (this.children[i]!.insert(obj)) {
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

  private _subdivide(): void {
    const min: Vector3D = this.bounds.min;
    const max: Vector3D = this.bounds.max;
    const center: Vector3D = MathPool.acquireVector().copyFrom(min).add(max).scale(0.5);

    const dims: number[][] = [
      [min.x, center.x],
      [center.x, max.x],
      [min.y, center.y],
      [center.y, max.y],
      [min.z, center.z],
      [center.z, max.z],
    ];

    for (let x: number = 0; x < 2; x++) {
      for (let y: number = 0; y < 2; y++) {
        for (let z: number = 0; z < 2; z++) {
          const childMin: Vector3D = new Vector3D(
            dims[0]?.[x] ?? 0,
            dims[2]?.[y] ?? 0,
            dims[4]?.[z] ?? 0,
          );
          const childMax: Vector3D = new Vector3D(
            dims[1]?.[x] ?? 0,
            dims[3]?.[y] ?? 0,
            dims[5]?.[z] ?? 0,
          );
          this.children.push(
            new OctreeNode(new BoundingBox(childMin, childMax), this._depth + 1, {
              maxDepth: this._maxDepth,
              maxObjects: this._maxObjects,
            }),
          );
        }
      }
    }

    MathPool.releaseVector(center);
    const oldObjects: Object3D[] = this.objects;
    this.objects = [];
    for (let i: number = 0; i < oldObjects.length; i++) {
      const obj: Object3D = oldObjects[i]!;
      let insertedInChild: boolean = false;
      for (let j: number = 0; j < this.children.length; j++) {
        if (this.children[j]!.insert(obj)) {
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
  public query(frustum: Frustum, result: Object3D[], intersectedNodes?: Set<OctreeNode>): void {
    if (!frustum.intersectsBox(this.bounds)) return;
    if (intersectedNodes) intersectedNodes.add(this);

    for (let i: number = 0; i < this.objects.length; i++) {
      const obj = this.objects[i]!;
      if (obj.bounds && frustum.intersectsVolume(obj.bounds)) {
        result.push(obj);
      }
    }
    for (let i: number = 0; i < this.children.length; i++) {
      this.children[i]!.query(frustum, result, intersectedNodes);
    }
  }

  /**
   * Queries the octree for objects that intersect with a ray.
   */
  public queryRay(
    ray: import("../physix/Ray.js").Ray,
    result: Set<Object3D>,
    intersectedNodes?: Set<OctreeNode>,
  ): void {
    if (ray.intersectsBox(this.bounds) < 0) return;
    if (intersectedNodes) intersectedNodes.add(this);

    for (let i: number = 0; i < this.objects.length; i++) {
      result.add(this.objects[i]!);
    }
    for (let i: number = 0; i < this.children.length; i++) {
      this.children[i]!.queryRay(ray, result, intersectedNodes);
    }
  }

  /**
   * Queries the octree for objects that intersect with a specific volume.
   */
  public queryVolume(volume: BoundingVolume, result: Object3D[]): void {
    if (!Collision.test(this.bounds, volume)) return;

    for (let i: number = 0; i < this.objects.length; i++) {
      const obj = this.objects[i]!;
      if (obj.bounds && Collision.test(obj.bounds, volume)) {
        result.push(obj);
      }
    }
    for (let i: number = 0; i < this.children.length; i++) {
      this.children[i]!.queryVolume(volume, result);
    }
  }

  public clear(): void {
    this.objects = [];
    for (let i: number = 0; i < this.children.length; i++) this.children[i]!.clear();
    this.children = [];
  }
}

/**
 * An octree for spatial partitioning.
 */
export class Octree {
  public root: OctreeNode;

  constructor(bounds: BoundingBox, options: OctreeOptions = {}) {
    this.root = new OctreeNode(bounds, 0, options);
  }

  public insert(obj: Object3D): boolean {
    return this.root.insert(obj);
  }

  public query(frustum: Frustum, intersectedNodes?: Set<OctreeNode>): Object3D[] {
    const result: Object3D[] = [];
    this.root.query(frustum, result, intersectedNodes);
    return result;
  }

  public queryRay(
    ray: import("../physix/Ray.js").Ray,
    intersectedNodes?: Set<OctreeNode>,
  ): Object3D[] {
    const result = new Set<Object3D>();
    this.root.queryRay(ray, result, intersectedNodes);
    return Array.from(result);
  }

  /**
   * Queries the octree for objects intersecting with a volume.
   */
  public queryVolume(volume: BoundingVolume): Object3D[] {
    const result: Object3D[] = [];
    this.root.queryVolume(volume, result);
    return result;
  }

  public clear(): void {
    this.root.clear();
  }
}
