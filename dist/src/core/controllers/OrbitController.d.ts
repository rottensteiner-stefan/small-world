import { Controller, CameraInterfaceData } from '../../interfaces/index.js';
/**
 * Configuration for the OrbitController.
 */
export interface OrbitControllerOptions {
    /** Look sensitivity. Defaults to 0.005. */
    lookSensitivity?: number;
    /** Rotation speed for keyboard. Defaults to 2.0. */
    rotationSpeed?: number;
    /** Minimum vertical angle (phi) in radians. Defaults to 0.01. */
    minPhi?: number;
    /** Maximum vertical angle (phi) in radians. Defaults to PI - 0.01. */
    maxPhi?: number;
    /** Whether rotation (Mouse) is enabled. Defaults to true. */
    enableRotation?: boolean;
}
/**
 * A controller that orbits a camera around a fixed target.
 */
export declare class OrbitController implements Controller {
    /** @inheritdoc */
    enabled: boolean;
    private _camera;
    private _options;
    /**
     * Creates a new OrbitController.
     * @param camera The camera to control.
     * @param options Configuration options.
     */
    constructor(camera: CameraInterfaceData, options?: OrbitControllerOptions);
    /** @inheritdoc */
    update(deltaTime: number): void;
}
