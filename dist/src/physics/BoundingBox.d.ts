import { BoundingVolume, FrustumInterface } from '../interfaces/index.js';
import { Vector3D, Matrix4 } from '../math/index.js';
import { BoundingType } from '../enums/index.js';
/**
 * Represents an axis-aligned bounding box (AABB).
 */
export declare class BoundingBox implements BoundingVolume {
    min: Vector3D;
    max: Vector3D;
    /** @inheritdoc */
    type: BoundingType;
    /** The center of the box. */
    center: Vector3D;
    /**
     * Creates a new BoundingBox.
     * @param min The minimum coordinates.
     * @param max The maximum coordinates.
     */
    constructor(min?: Vector3D, max?: Vector3D);
    /**
     * Creates a new BoundingBox that encapsulates all provided vertices.
     * @param vertices The raw vertex data [x, y, z, ...].
     * @returns A new BoundingBox instance.
     */
    static fromVertices(vertices: ArrayLike<number>): BoundingBox;
    /** @inheritdoc */
    getBroadRadius(): number;
    /**
     * Checks if a point is inside the box.
     * @param point The point to check.
     * @returns True if inside.
     */
    containsPoint(point: Vector3D): boolean;
    /**
     * Checks if another box intersects with this one.
     * @param other The other box.
     * @returns True if intersecting.
     */
    intersectsBox(other: BoundingBox): boolean;
    /** @inheritdoc */
    intersectsFrustum(frustum: FrustumInterface): boolean;
    /** @inheritdoc */
    intersectsVolume(other: BoundingVolume): boolean;
    /** @inheritdoc */
    transform(matrix: Matrix4): void;
}
