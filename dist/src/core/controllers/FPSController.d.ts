import { CameraInterfaceData, Controller } from '../../interfaces/index.js';
import { Object3D } from '../Object3D.js';
/**
 * Configuration for the FPSControlle
 */
export interface FPSControllerOptions {
    /** Movement speed in units per second. Defaults to 10. */
    moveSpeed?: number;
    /** Look sensitivity. Defaults to 0.005. */
    lookSensitivity?: number;
    /** Whether movement (WASD) is enabled. Defaults to true. */
    enableMovement?: boolean;
    /** Whether rotation (Mouse) is enabled. Defaults to true. */
    enableRotation?: boolean;
    /** Whether vertical movement (Q/E) is enabled. Defaults to true. */
    enableVertical?: boolean;
}
/**
 * A controller for first-person style movement and looking.
 * Can be attached to a Camera or any Object3D.
 */
export declare class FPSController implements Controller {
    /** @inheritdoc */
    enabled: boolean;
    private _target;
    private _options;
    /**
     * Creates a new FPSController.
     * @param target The object or camera to control.
     * @param options Configuration options.
     */
    constructor(target: CameraInterfaceData | Object3D, options?: FPSControllerOptions);
    /** @inheritdoc */
    update(deltaTime: number): void;
}
