import { Matrix4 } from './Matrix4.js';
import { BoundingVolume } from '../interfaces/index.js';
import { BoundingBox } from '../physix/index.js';
/**
 * A class representing a camera frustum defined by 6 planes.
 * Used for frustum culling.
 */
export declare class Frustum {
    /**
     * The planes of the frustum (6 planes * 4 components = 24 floats).
     * Format: Ax + By + Cz + D = 0.
     */
    planes: Float32Array;
    /**
     * Sets the frustum planes from a projection matrix.
     * @param m The matrix to set from (usually View-Projection).
     */
    setFromMatrix(m: Matrix4): void;
    /**
     * Checks if a bounding volume intersects with the frustum.
     * @param volume The bounding volume to check.
     * @returns True if the volume is inside or intersecting the frustum.
     */
    intersectsVolume(volume: BoundingVolume): boolean;
    /**
     * Checks if a bounding box intersects with the frustum.
     * @param box The bounding box to check.
     * @returns True if the box is inside or intersecting the frustum.
     */
    intersectsBox(box: BoundingBox): boolean;
}
