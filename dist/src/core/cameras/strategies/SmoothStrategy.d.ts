import { Camera } from '../../Camera.js';
import { CameraConstraints, CameraStrategy } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/Vector3D.js';
/**
 * A camera strategy that smoothly follows a target.
 */
export declare class SmoothStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** The radius of the camera from the target. */
    radius: number;
    /** The lerp factor for smoothing. */
    lerpFactor: number;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}
