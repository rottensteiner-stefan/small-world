import { CameraInterfaceData, CameraConstraints, CameraStrategy } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/Vector3D.js';
/**
 * A camera strategy where the developer has full manual control.
 * The engine performs no automatic position or target updates.
 */
export declare class ManualStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    /** @inheritdoc */
    update(_camera: CameraInterfaceData, _targetPos: Vector3D, _dx: number, _dy: number): void;
}
