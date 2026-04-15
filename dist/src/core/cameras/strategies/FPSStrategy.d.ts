import { CameraConstraints, CameraStrategy } from '../../../interfaces/index.js';
import { Camera } from '../../Camera.js';
import { Vector3D } from '../../../math/Vector3D.js';
/**
 * A first-person camera strategy.
 */
export declare class FPSStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** The height offset from the target position. */
    heightOffset: number;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(camera: Camera, targetPos: Vector3D, dx: number, dy: number): void;
}
