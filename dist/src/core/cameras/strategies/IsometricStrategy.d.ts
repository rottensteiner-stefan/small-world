import { CameraConstraints, CameraStrategy, CameraInterfaceData } from '../../../interfaces/index.js';
import { Camera } from '../../Camera.js';
import { Vector3D } from '../../../math/Vector3D.js';
/**
 * Strategy for an isometric 2D/3D camera.
 * Uses an orthographic projection and fixed angles.
 */
export declare class IsometricStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** Whether to snap the camera position to whole pixels. */
    pixelPerfect: boolean;
    /** The zoom level (world units per screen unit). */
    zoom: number;
    /** Optional constraints for the camera. */
    constraints?: CameraConstraints;
    /**
     * Updates the camera position and target.
     * @param camera The camera to update.
     * @param targetPos The target position to follow.
     * @param _dx Unused.
     * @param _dy Unused.
     */
    update(camera: Camera, targetPos: Vector3D, _dx: number, _dy: number): void;
    /**
     * Maps screen coordinates to world coordinates on the Y=0 plane.
     * @param screenX Normalized screen X (-1 to 1).
     * @param screenY Normalized screen Y (-1 to 1).
     * @param camera The camera used for rendering.
     * @returns The world position.
     */
    screenToWorld(screenX: number, screenY: number, camera: CameraInterfaceData): Vector3D;
}
