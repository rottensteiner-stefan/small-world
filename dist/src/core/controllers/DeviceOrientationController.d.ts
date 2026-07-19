import { Behavior } from '../behaviors/index.js';
import { Object3D } from '../index.js';
import { CameraInterfaceData } from '../../interfaces/index.js';
/**
 * A controller that rotates its target based on the device's physical orientation sensors.
 */
export declare class DeviceOrientationController extends Behavior {
    enabled: boolean;
    private _alpha;
    private _beta;
    private _gamma;
    private _isInitialized;
    private _onDeviceOrientation;
    onAttach(target: Object3D | CameraInterfaceData): void;
    private _initSensors;
    private _startListening;
    update(_deltaTime: number): void;
    onDetach(): void;
}
