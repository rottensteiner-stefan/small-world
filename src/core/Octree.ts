/// src/core/Octree.ts

import { BoundingBox } from "../physics/BoundingBox.js";
import { Object3D } from "./Object3D.js";
import { Frustum } from "../math/Frustum.js";
import { Vector3D, MathPool } from "../math/index.js";
import { BoundingType } from "../enums/index.js";

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
   * @param obj The object to insert.
   * @returns True if the object was inserted.
   */
  public insert(obj: Object3D): boolean {
    if (!obj.bounds || BoundingType.BOX !== obj.bounds.type) {
      return false;
    }

    const objBox: BoundingBox = obj.bounds as BoundingBox;

    if (!this.bounds.intersectsBox(objBox)) {
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

  /**
   * Subdivides the node into 8 children.
   * @private
   */
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
      this.insert(oldObjects[i]!);
    }
  }

  /**
   * Queries the octree for objects that intersect with the frustum.
   * @param frustum The frustum to check.
   * @param result The array to store the results.
   */
  public query(frustum: Frustum, result: Object3D[]): void {
    if (!frustum.intersectsBox(this.bounds)) {
      return;
    }

    for (let i: number = 0; i < this.objects.length; i++) {
      const obj = this.objects[i]!;
      if (obj.bounds && frustum.intersectsVolume(obj.bounds)) {
        result.push(obj);
      }
    }

    for (let i: number = 0; i < this.children.length; i++) {
      this.children[i]!.query(frustum, result);
    }
  }

  /**
   * Clears the node and its children.
   */
  public clear(): void {
    this.objects = [];
    for (let i: number = 0; i < this.children.length; i++) {
      this.children[i]!.clear();
    }
    this.children = [];
  }
}

/**
 * An octree for spatial partitioning.
 */
export class Octree {
  /** The root node of the octree. */
  public root: OctreeNode;

  /**
   * Creates a new Octree.
   * @param bounds The bounds of the octree.
   * @param options The configuration options.
   */
  constructor(bounds: BoundingBox, options: OctreeOptions = {}) {
    this.root = new OctreeNode(bounds, 0, options);
  }

  /**
   * Inserts an object into the octree.
   * @param obj The object to insert.
   */
  public insert(obj: Object3D): void {
    this.root.insert(obj);
  }

  /**
   * Queries the octree for objects that intersect with the frustum.
   * @param frustum The frustum to check.
   * @returns The list of intersecting objects.
   */
  public query(frustum: Frustum): Object3D[] {
    const result: Object3D[] = [];
    this.root.query(frustum, result);
    return result;
  }

  /**
   * Clears the octree.
   */
  public clear(): void {
    this.root.clear();
  }
}
