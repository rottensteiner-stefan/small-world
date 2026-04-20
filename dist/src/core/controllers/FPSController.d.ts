import { CameraInterfaceData, Controller } from '../../interfaces/index.js';
import { Object3D } from '../Object3D.js';
import { Scene } from '../Scene.js';
/**
 * Configuration for the FPSController.
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
    /** Whether collisions are enabled. Requires a Scene reference. */
    enableCollision?: boolean;
    /** The radius of the collision sphere. Defaults to 0.5. */
    collisionRadius?: number;
}
/**
 * A controller for first-person style movement and looking.
 */
export declare class FPSController implements Controller {
    enabled: boolean;
    private _target;
    private _options;
    private _scene;
    private _collider;
    /**
     * Creates a new FPSController.
     */
    constructor(target: CameraInterfaceData | Object3D, options?: FPSControllerOptions, scene?: Scene);
    update(deltaTime: number): void;
    private _resolveCollisions;
}
