import { CameraConstraints, CameraStrategy, CameraInterfaceData } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/index.js';
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
    update(camera: CameraInterfaceData, targetPos: Vector3D, dx: number, dy: number): void;
}
