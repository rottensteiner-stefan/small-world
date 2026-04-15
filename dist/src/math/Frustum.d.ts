import { Matrix4 } from './Matrix4.js';
import { BoundingVolume } from '../interfaces/index.js';
import { BoundingBox } from '../physics/index.js';
/**
 * A class representing a camera frustum.
 */
export declare class Frustum {
    /**
     * The planes of the frustum.
     */
    planes: Float32Array;
    /**
     * Sets the frustum planes from a matrix.
     * @param m The matrix to set from.
     */
    setFromMatrix(m: Matrix4): void;
    /**
     * Checks if a bounding volume intersects with the frustum.
     * @param volume The bounding volume to check.
     * @returns True if the volume intersects with the frustum.
     */
    intersectsVolume(volume: BoundingVolume): boolean;
    /**
     * Checks if a bounding box intersects with the frustum.
     * @param box The bounding box to check.
     * @returns True if the box intersects with the frustum.
     */
    intersectsBox(box: BoundingBox): boolean;
}
