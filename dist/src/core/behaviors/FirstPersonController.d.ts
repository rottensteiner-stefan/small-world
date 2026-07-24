import { Behavior } from './Behavior.js';
import { CameraInterfaceData } from '../../interfaces/index.js';
import { Object3D, InputInterface, Scene } from '../index.js';
import { BoundingSphere } from '../../physix/index.js';
/**
 * Configuration for the FirstPersonController.
 */
export interface FirstPersonControllerOptions {
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
    /** Enable classic retro tank controls (turning with A/D) vs modern strafing. Defaults to true. */
    retroTankControls?: boolean;
    /** Input source. Required — no global fallback. */
    input?: InputInterface;
}
/**
 * A generalized First Person Controller handling movement, rotation, and collisions.
 */
export declare class FirstPersonController extends Behavior {
    enabled: boolean;
    protected _options: Required<Omit<FirstPersonControllerOptions, "scene" | "input">> & {
        scene: Scene | undefined;
        input: InputInterface;
    };
    protected _collider?: BoundingSphere;
    distanceMoved: number;
    bobPhase: number;
    isMoving: boolean;
    /**
     * Creates a new FirstPersonController.
     * @param options The configuration options.
     */
    constructor(options?: FirstPersonControllerOptions);
    onAttach(target: Object3D | CameraInterfaceData): void;
    update(deltaTime: number): void;
}
