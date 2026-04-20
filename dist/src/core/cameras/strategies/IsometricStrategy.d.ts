import { CameraConstraints, CameraStrategy, CameraInterfaceData } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/Vector3D.js';
/**
 * Strategy for an isometric 2D/3D camera.
 * Uses an orthographic projection and fixed angles.
 */
export declare class IsometricStrategy implements CameraStrategy {
    readonly type: string;
    pixelPerfect: boolean;
    zoomFactor: number;
    constraints?: CameraConstraints;
    /**
     * Updates the camera position and target.
     */
    update(camera: CameraInterfaceData, targetPos: Vector3D, _dx: number, _dy: number): void;
}
