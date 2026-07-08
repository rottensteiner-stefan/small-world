import { CameraInterfaceData, CameraConstraints, CameraStrategy } from '../../../interfaces/index.js';
import { Vector3D } from '../../../math/index.js';
/**
 * A hybrid camera strategy that synchronizes manual position changes
 * with orbital spherical coordinates.
 */
export declare class HybridSyncStrategy implements CameraStrategy {
    /** @inheritdoc */
    readonly type: string;
    /** @inheritdoc */
    constraints?: CameraConstraints;
    private _lastPosition;
    private _isInitialized;
    /** @inheritdoc */
    update(camera: CameraInterfaceData, targetPos: Vector3D, dx: number, dy: number): void;
    /**
     * Calculates Theta, Phi, and Radius based on the current Cartesian position.
     */
    private _syncSphericalFromCartesian;
    /**
     * Updates the Cartesian position based on current Theta, Phi, and distance.
     */
    private _syncCartesianFromSpherical;
}
