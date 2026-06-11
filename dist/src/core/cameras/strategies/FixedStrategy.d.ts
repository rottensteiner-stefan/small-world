import { CameraInterfaceData, CameraConstraints, CameraStrategy } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/Vector3D.js';
/**
 * A camera strategy where the camera stays at its current position but looks at a target.
 * This strategy allows manual movement of the camera's position property while
 * ensuring the view orientation is updated correctly.
 */
export declare class FixedStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(camera: CameraInterfaceData, targetPos: Vector3D, _dx: number, _dy: number): void;
}
