import { BoundingVolume } from '../interfaces/index.js';
import { Vector3D } from '../math/Vector3D.js';
import { BoundingType } from '../enums/index.js';
/**
 * Represents an axis-aligned bounding box (AABB) in 3D space.
 */
export declare class BoundingBox implements BoundingVolume {
    min: Vector3D;
    max: Vector3D;
    /** @inheritdoc */
    type: BoundingType;
    /** The broad radius for coarse intersection tests. */
    broadRadius: number;
    /** Internal storage for the center point. */
    private _center;
    /**
     * Creates a new BoundingBox.
     * @param min The minimum coordinates (lower-left-back).
     * @param max The maximum coordinates (upper-right-front).
     */
    constructor(min: Vector3D, max: Vector3D);
    /**
     * Creates a BoundingBox that encapsulates all provided vertices.
     */
    static fromVertices(v: Float32Array): BoundingBox;
    /**
     * Checks if this bounding box contains a point.
     */
    containsPoint(point: Vector3D): boolean;
    /**
     * Checks if this bounding box contains another bounding box.
     */
    containsBox(other: BoundingBox): boolean;
    /**
     * Checks if this bounding box intersects with another bounding box.
     */
    intersectsBox(other: BoundingBox): boolean;
    /** @inheritdoc */
    get center(): Vector3D;
    /** @inheritdoc */
    getBroadRadius(): number;
}
