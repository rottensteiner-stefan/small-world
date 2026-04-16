import { Camera } from '../core/Camera.js';
import { Vector3D } from '../math/Vector3D.js';
import { CameraConstraints } from './CameraConstraints.js';
/**
 * Interface for camera control strategies (e.g. FPS, Orbit, Smooth).
 */
export interface CameraStrategy {
    /** The unique type identifier of the strategy. */
    readonly type: string;
    /** Optional spatial constraints for the camera. */
    constraints?: CameraConstraints | undefined;
    /**
     * Updates the camera position and target based on the strategy's logic.
     * @param camera The camera to update.
     * @param targetPos The target position to follow.
     * @param dx The horizontal rotation delta.
     * @param dy The vertical rotation delta.
     */
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}
