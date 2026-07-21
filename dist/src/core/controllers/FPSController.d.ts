import { Behavior } from '../behaviors/Behavior.js';
import { CameraInterfaceData } from '../../interfaces/index.js';
import { InputInterface, Scene } from '../index.js';
import { InputMode } from '../../enums/index.js';
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
export declare class FPSController extends Behavior {
    enabled: boolean;
    private _options;
    private _collider?;
    /**
     * Creates a new FPSController.
     * @param options The configuration options.
     */
    constructor(options?: FPSControllerOptions);
    onAttach(target: import('../index.js').Object3D | CameraInterfaceData): void;
    update(deltaTime: number): void;
}
