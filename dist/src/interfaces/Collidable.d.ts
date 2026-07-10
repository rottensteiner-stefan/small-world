import { BoundingVolume } from './BoundingVolume.js';
/**
 * Interface for objects that can be tested for physical collisions.
 * Decouples collision detection from the heavy Object3D class.
 */
export interface Collidable {
    /** The physical bounding volume of the object. */
    bounds: BoundingVolume | undefined;
}
