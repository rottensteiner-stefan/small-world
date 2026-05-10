import { CameraInterfaceData, Controller } from '../../interfaces/index.js';
import { Object3D } from '../Object3D.js';
import { InputInterface } from '../Input.js';
import { InputMode } from '../../enums/index.js';
import { Scene } from '../Scene.js';
/**
 * Configuration for the FPSController.
 */
export interface FPSControllerOptions {
    /** Movement speed in units per second. Defaults to 10. */
    moveSpeed?: number;
    /** Look sensitivity. Defaults to 0.005. */
    lookSensitivity?: number;
    /** Input mode for A/D keys (STRAFE or TANK). Defaults to TANK. */
    inputMode?: InputMode;
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
    /** The scene to check for collisions. */
    scene?: Scene;
    /** Optional input source (for testing). Defaults to global Input.instance. */
    input?: InputInterface;
}
/**
 * A controller for first-person style movement and looking.
 */
export declare class FPSController implements Controller {
    enabled: boolean;
    private _target;
    private _options;
    private _collider;
    /**
     * Creates a new FPSController.
     * @param target The target object or camera to control.
     * @param options The configuration options.
     */
    constructor(target: CameraInterfaceData | Object3D, options?: FPSControllerOptions);
    update(deltaTime: number): void;
    private _resolveCollisions;
}
