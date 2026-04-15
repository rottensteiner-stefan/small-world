import { Vector3D } from '../math/Vector3D.js';
/**
 * Interface defining constraints for the camera position or target.
 */
export interface CameraConstraints {
    /** The minimum world coordinates for the camera/target. */
    min?: Vector3D;
    /** The maximum world coordinates for the camera/target. */
    max?: Vector3D;
}
