import { Behavior } from '../behaviors/index.js';
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
export declare class OrbitController extends Behavior {
    enabled: boolean;
    private _options;
    /**
     * Creates a new OrbitController.
     * @param options Configuration options.
     */
    constructor(options?: OrbitControllerOptions);
    update(_deltaTime: number): void;
}
