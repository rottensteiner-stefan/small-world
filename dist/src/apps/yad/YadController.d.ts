import { Behavior } from '../../core/behaviors/Behavior.js';
import { CameraInterfaceData } from '../../interfaces/index.js';
import { Object3D } from '../../core/Object3D.js';
import { Scene } from '../../core/Scene.js';
/**
 * Configuration for the YadController.
 */
export interface YadControllerOptions {
    /** Movement speed in units per second. Defaults to 10. */
    moveSpeed?: number;
    /** Rotation speed in radians per second. Defaults to 2.0. */
    rotationSpeed?: number;
    /** Whether collisions are enabled. Requires a Scene reference. */
    enableCollision?: boolean;
    /** The radius of the collision sphere. Defaults to 0.5. */
    collisionRadius?: number;
    /** The scene to check for collisions. */
    scene?: Scene;
}
/**
 * A retro style controller for forward/backward movement and left/right rotation.
 * Controls:
 * - Forward: ArrowUp or W
 * - Backward: ArrowDown or S
 * - Turn Left: ArrowLeft or A
 * - Turn Right: ArrowRight or D
 */
export declare class YadController extends Behavior {
    enabled: boolean;
    private _options;
    private _collider?;
    private _distanceMoved;
    private _lastShotTime;
    private _lastHurtTime;
    /**
     * Creates a new YadController.
     * @param options The configuration options.
     */
    constructor(options?: YadControllerOptions);
    onAttach(target: Object3D | CameraInterfaceData): void;
    update(deltaTime: number): void;
    /**
     * Internal helper to resolve physical collisions against scene geometry.
     */
    private _resolveCollisions;
}
