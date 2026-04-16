import { Vector3D } from '../math/index.js';
import { BoundingType } from '../enums/index.js';
/**
 * Interface for bounding volumes used for collision detection and culling.
 */
export interface BoundingVolume {
    /** The type of the bounding volume. */
    type: BoundingType;
    /** The center position of the volume in world space. */
    center: Vector3D;
    /**
     * Returns the radius of a sphere that fully encloses the volume.
     * Used for coarse broad-phase intersection tests.
     * @returns The broad radius.
     */
    getBroadRadius(): number;
}
