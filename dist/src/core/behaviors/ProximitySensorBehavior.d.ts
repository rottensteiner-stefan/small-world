import { Behavior } from './Behavior.js';
import { Object3D } from '../index.js';
import { CameraInterfaceData } from '../../interfaces/index.js';
/**
 * Configuration options for the ProximitySensorBehavior.
 */
export interface ProximitySensorOptions {
    /** The target object to measure distance to. Can be an Object3D or a Camera (CameraInterfaceData). */
    targetObj: Object3D | CameraInterfaceData;
    /** The outer distance at which the factor starts rising above 0.0. */
    radius: number;
    /** The inner distance at which the factor reaches 1.0. Defaults to 0.0. */
    minDistance?: number;
    /** Callback executed every frame with the normalized proximity factor (0.0 to 1.0). */
    onUpdate: (factor: number, distance: number, deltaTime: number) => void;
}
/**
 * A behavior that acts as a proximity sensor.
 * It measures the distance between the object it is attached to and a target object,
 * and calls the `onUpdate` callback with a normalized factor between 0.0 (far away) and 1.0 (close).
 */
export declare class ProximitySensorBehavior extends Behavior {
    options: Required<ProximitySensorOptions>;
    private _myPosition;
    private _targetPosition;
    /**
     * Creates a new ProximitySensorBehavior.
     * @param options Configuration options.
     */
    constructor(options: ProximitySensorOptions);
    /**
     * Helper to safely extract the world position of an Object3D or Camera.
     */
    private _getWorldPosition;
    update(deltaTime: number): void;
}
