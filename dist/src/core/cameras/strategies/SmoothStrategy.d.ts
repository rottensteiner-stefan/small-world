import { CameraInterfaceData, CameraConstraints, CameraStrategy } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/index.js';
/**
 * A camera strategy that smoothly follows a target.
 */
export declare class SmoothStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** The radius of the camera from the target. */
    radius: number;
    /** Minimum allowed radius. */
    minRadius: number;
    /** Maximum allowed radius. */
    maxRadius: number;
    /** The lerp factor for smoothing. */
    lerpFactor: number;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    private _isInitialized;
    /** @inheritdoc */
    update(camera: CameraInterfaceData, targetPos: Vector3D, dx: number, dy: number): void;
    /** @inheritdoc */
    zoom(_camera: CameraInterfaceData, delta: number): boolean;
}
