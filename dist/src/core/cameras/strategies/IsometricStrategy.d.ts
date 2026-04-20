import { CameraConstraints, CameraStrategy } from '../../../interfaces/index.js';
import { Camera } from '../../Camera.js';
import { Vector3D } from '../../../math/Vector3D.js';
/**
 * Strategy for an isometric 2D/3D camera.
 * Uses an orthographic projection and fixed angles.
 */
export declare class IsometricStrategy implements CameraStrategy {
    readonly type: string;
    pixelPerfect: boolean;
    zoom: number;
    constraints?: CameraConstraints;
    /**
     * Updates the camera position and target.
     */
    update(camera: Camera, targetPos: Vector3D, _dx: number, _dy: number): void;
}
