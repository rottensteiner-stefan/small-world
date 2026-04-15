import { Camera } from '../../Camera.js';
import { CameraConstraints, CameraStrategy } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/Vector3D.js';
/**
 * A camera strategy where the camera remains at a fixed position but looks at a target.
 */
export declare class FixedStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(camera: Camera, targetPos: Vector3D, _dx: number, _dy: number): void;
}
