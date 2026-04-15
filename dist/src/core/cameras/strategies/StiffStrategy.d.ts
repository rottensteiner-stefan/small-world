import { Camera } from '../../Camera.js';
import { CameraConstraints, CameraStrategy } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/Vector3D.js';
/**
 * A camera strategy that rigidly follows a target.
 */
export declare class StiffStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** The radius of the camera from the target. */
    radius: number;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}
