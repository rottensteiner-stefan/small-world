import { BoundingBox } from './BoundingBox.js';
import { Vector3D } from '../math/index.js';
/**
 * Represents a mathematical ray in 3D space.
 */
export declare class Ray {
    origin: Vector3D;
    direction: Vector3D;
    /**
     * Creates a new Ray.
     * @param origin The origin point of the ray.
     * @param direction The normalized direction vector of the ray.
     */
    constructor(origin?: Vector3D, direction?: Vector3D);
    /**
     * Sets the ray's origin and direction.
     * @param origin The new origin.
     * @param direction The new normalized direction.
     * @returns This ray instance.
     */
    set(origin: Vector3D, direction: Vector3D): this;
    /**
     * Computes the point along the ray at a given distance.
     * @param t The distance along the ray.
     * @param target Optional target vector.
     * @returns The computed point.
     */
    at(t: number, target?: Vector3D): Vector3D;
    /**
     * Tests whether this ray intersects the given AABB.
     * Uses the slab method.
     * @param box The axis-aligned bounding box.
     * @returns The distance `t` to the intersection, or -1 if no intersection.
     */
    intersectsBox(box: BoundingBox): number;
}
