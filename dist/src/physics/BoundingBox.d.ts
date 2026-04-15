import { BoundingVolume } from '../interfaces/index.js';
import { Vector3D } from '../math/Vector3D.js';
import { BoundingType } from '../enums/index.js';
/**
 * Represents an axis-aligned bounding box (AABB).
 */
export declare class BoundingBox implements BoundingVolume {
    min: Vector3D;
    max: Vector3D;
    /** @inheritdoc */
    type: BoundingType;
    /** The broad radius for coarse intersection tests. */
    broadRadius: number;
    private _center;
    /**
     * Creates a new BoundingBox.
     * @param min The minimum coordinates.
     * @param max The maximum coordinates.
     */
    constructor(min: Vector3D, max: Vector3D);
    /**
     * Checks if this bounding box contains a point.
     * @param point The point to check.
     * @returns True if the point is inside the bounding box.
     */
    containsPoint(point: Vector3D): boolean;
    /**
     * Checks if this bounding box contains another bounding box.
     * @param other The other bounding box.
     * @returns True if the other bounding box is completely inside this one.
     */
    containsBox(other: BoundingBox): boolean;
    /**
     * Checks if this bounding box intersects with another bounding box.
     * @param other The other bounding box.
     * @returns True if the bounding boxes intersect.
     */
    intersectsBox(other: BoundingBox): boolean;
    /** @inheritdoc */
    get center(): Vector3D;
    /** @inheritdoc */
    getBroadRadius(): number;
}
